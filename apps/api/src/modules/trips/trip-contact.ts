import { createHmac } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { activeRoles } from '../auth/profile.js';

type ChatMessage = { id: string; uid: string; text: string; sentAt: number };
type VoiceCall = { id: string; caller: string; offer: string; answer?: string; expiresAt: number };
type Contact = { messages: ChatMessage[]; call: VoiceCall | null; revision: number };
const live = ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const invalid = () => new AppError(400, 'INVALID_CONTACT_ACTION', 'Invalid trip contact request.');

export function tripContact(db: Firestore, tripId: string, uid: string, input?: Record<string, unknown>) {
  const room = db.collection('tripContacts').doc(tripId);
  return db.runTransaction(async tx => {
    const [trip, actor, contact] = await Promise.all([
      tx.get(db.collection('trips').doc(tripId)), tx.get(db.collection('users').doc(uid)), tx.get(room),
    ]);
    const role = trip.get('customerId') === uid ? 'CUSTOMER' : trip.get('driverId') === uid ? 'DRIVER' : null;
    if (!role || !activeRoles(actor.data()).includes(role) || !live.includes(trip.get('status'))) {
      throw new AppError(404, 'CONTACT_UNAVAILABLE', 'Contact is only available to the customer and driver on an active trip.');
    }
    const now = Date.now();
    const stored = contact.data() as Contact | undefined;
    const messages = stored?.messages ?? [];
    const call = stored?.call && stored.call.expiresAt > now ? stored.call : null;
    const revision = stored?.revision ?? 0;
    const current = { messages, call, revision };
    const save = (nextMessages: ChatMessage[], nextCall: VoiceCall | null): Contact => {
      const state = { messages: nextMessages, call: nextCall, revision: revision + 1 };
      tx.set(room, state);
      return state;
    };
    if (!input) return current;
    if (input.action === 'voice-config') {
      const url = process.env.TRIP_TURN_URL?.trim();
      const secret = process.env.TRIP_TURN_SECRET;
      if (!url || !/^turns?:/i.test(url) || !secret) return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
      const username = `${Math.ceil(now / 1000) + 3600}:${uid}`;
      return { iceTransportPolicy: 'relay', iceServers: [{ urls: url, username,
        credential: createHmac('sha1', secret).update(username).digest('base64') }] };
    }
    if (typeof input.id !== 'string' || !/^[a-zA-Z0-9-]{12,64}$/.test(input.id)) throw invalid();
    if (input.action === 'message') {
      const text = typeof input.text === 'string' ? input.text.trim() : '';
      if (!text || text.length > 1000) throw invalid();
      if (messages.some(message => message.uid === uid && message.id === input.id)) return current;
      const last = messages.filter(message => message.uid === uid).at(-1);
      if (last && now - last.sentAt < 500) throw new AppError(429, 'CHAT_RATE_LIMIT', 'Wait a moment before sending another message.');
      const next = [...messages, { id: input.id, uid, text, sentAt: now }].slice(-50);
      return save(next, call);
    }
    let next: VoiceCall | null;
    if (input.action === 'offer' || input.action === 'answer') {
      if (typeof input.sdp !== 'string' || !input.sdp.startsWith('v=0') || input.sdp.length > 24_000) throw invalid();
      if (input.action === 'offer') {
        if (call?.id === input.id && call.caller === uid) return current;
        if (call) throw new AppError(409, 'CALL_BUSY', 'Another call is already open.');
        next = { id: input.id, caller: uid, offer: input.sdp, expiresAt: now + 45_000 };
      } else {
        if (!call || call.id !== input.id || call.caller === uid) throw new AppError(409, 'CALL_UNAVAILABLE', 'This call is no longer available.');
        if (call.answer === input.sdp) return current;
        if (call.answer) throw new AppError(409, 'CALL_ALREADY_ANSWERED', 'The call was already answered on another device.');
        next = { ...call, answer: input.sdp, expiresAt: now + 60 * 60_000 };
      }
    } else if (input.action === 'end') {
      if (call?.id !== input.id) return current;
      next = null;
    } else throw invalid();
    return save(messages, next);
  });
}
