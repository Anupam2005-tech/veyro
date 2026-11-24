'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Phone, PhoneOff } from 'lucide-react';
import { FormAlert, VeyroButton } from '@veyro/ui';
import type { AuthUser } from '@/lib/auth/types';
import { ApiClientError, request } from '@/lib/api/transport';
import { usePolling } from '@/lib/hooks/use-polling';

type Message = { id: string; uid: string; text: string; sentAt: number };
type Call = { id: string; caller: string; offer: string; answer?: string };
type Room = { messages: Message[]; call: Call | null; revision: number };
type Connection = { id: string; pc: RTCPeerConnection; microphone: MediaStream };

async function gatherSdp(pc: RTCPeerConnection) {
  if (pc.iceGatheringState !== 'complete') {
    await new Promise<void>(resolve => {
      const finish = () => {
        clearTimeout(timeout);
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      };
      const onChange = () => { if (pc.iceGatheringState === 'complete') finish(); };
      const timeout = setTimeout(finish, 6_000);
      pc.addEventListener('icegatheringstatechange', onChange);
    });
  }
  const sdp = pc.localDescription?.sdp;
  if (!sdp || !sdp.includes('a=candidate:')) throw new Error('Voice connection could not reach a network. Try again.');
  return sdp;
}

export function TripContactPanel({ user, tripId, counterpart }: {
  user: AuthUser; tripId: string; counterpart: 'driver' | 'customer';
}) {
  const path = '/trips/' + encodeURIComponent(tripId) + '/contact';
  const [room, setRoom] = useState<Room>({ messages: [], call: null, revision: 0 });
  const applyRoom = useCallback((next: Room) => {
    setRoom(current => next.revision < current.revision ? current : next);
  }, []);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const connection = useRef<Connection | null>(null);
  const active = useRef(false);
  const pendingMessage = useRef<{ id: string; text: string } | null>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const lastMessage = room.messages.at(-1)?.id;

  const post = useCallback(async <T,>(body: object, keepalive = false): Promise<T> => {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body), keepalive }, await user.getIdToken());
  }, [path, user]);
  function closeConnection() {
    const current = connection.current;
    connection.current = null;
    if (current) {
      current.pc.close();
      current.microphone.getTracks().forEach(track => track.stop());
    }
  }

  useEffect(() => {
    active.current = true;
    void user.getIdToken().then(token => request<Room>(path, { method: 'GET' }, token))
      .then(next => { if (active.current) applyRoom(next); })
      .catch(caught => { if (active.current) setError(caught instanceof Error ? caught.message : 'Trip contact unavailable.'); });
    return () => {
      active.current = false;
      const id = connection.current?.id;
      closeConnection();
      if (id) void post<Room>({ action: 'end', id }, true).catch(() => {});
    };
  }, [applyRoom, path, post, user]);

  usePolling(user.uid + ':' + tripId, async () =>
    request<Room>(path, { method: 'GET' }, await user.getIdToken()),
    applyRoom,
    caught => {
      if (caught instanceof ApiClientError && caught.code === 'CONTACT_UNAVAILABLE') {
        closeConnection();
        setRemote(null);
        setRoom({ messages: [], call: null, revision: Number.MAX_SAFE_INTEGER });
      }
      setError(caught instanceof Error ? caught.message : 'Trip contact unavailable.');
    }, 2_000);

  useEffect(() => {
    if (audio.current) audio.current.srcObject = remote;
  }, [remote]);
  useEffect(() => {
    if (scrollArea.current) scrollArea.current.scrollTop = scrollArea.current.scrollHeight;
  }, [lastMessage]);
  useEffect(() => {
    const current = connection.current, call = room.call;
    if (!current || calling) return;
    if (!call || call.id !== current.id) {
      closeConnection();
      setRemote(null);
      setCallStatus('Call ended.');
    } else if (call.caller === user.uid && call.answer && current.pc.signalingState === 'have-local-offer') {
      void current.pc.setRemoteDescription({ type: 'answer', sdp: call.answer }).catch(() => {
        setError('Could not connect the voice call.');
        closeConnection();
      });
    }
  }, [room.call, calling, user.uid]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    const id = pendingMessage.current?.text === text ? pendingMessage.current.id : crypto.randomUUID();
    pendingMessage.current = { id, text };
    setSending(true);
    setError(null);
    try {
      applyRoom(await post<Room>({ action: 'message', id, text }));
      setDraft('');
      pendingMessage.current = null;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the message.');
    } finally {
      setSending(false);
    }
  }

  async function connect(incoming?: Call) {
    if (calling || connection.current) return;
    setCalling(true);
    setError(null);
    const id = incoming?.id ?? crypto.randomUUID();
    let acquiredMicrophone: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error('Voice calls need a supported browser and a secure connection.');
      }
      const config = await post<RTCConfiguration>({ action: 'voice-config' });
      if (!active.current) return;
      const microphone = acquiredMicrophone = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) {
        microphone.getTracks().forEach(track => track.stop());
        return;
      }
      const pc = new RTCPeerConnection(config);
      connection.current = { id, pc, microphone };
      setCallStatus(incoming ? 'Connecting…' : 'Calling…');
      microphone.getTracks().forEach(track => pc.addTrack(track, microphone));
      pc.ontrack = event => setRemote(event.streams[0] ?? new MediaStream([event.track]));
      pc.onconnectionstatechange = () => {
        if (connection.current?.pc !== pc) return;
        if (pc.connectionState === 'connected') setCallStatus('Voice call connected');
        if (pc.connectionState === 'failed') {
          setError('Voice connection failed. Try again.');
          closeConnection();
          setRemote(null);
          setCallStatus(null);
          void post<Room>({ action: 'end', id }).then(applyRoom).catch(() => {});
        }
      };
      if (incoming) await pc.setRemoteDescription({ type: 'offer', sdp: incoming.offer });
      await pc.setLocalDescription(incoming ? await pc.createAnswer() : await pc.createOffer());
      const sdp = await gatherSdp(pc);
      if (!active.current || connection.current?.pc !== pc) return;
      applyRoom(await post<Room>({ action: incoming ? 'answer' : 'offer', id, sdp }));
    } catch (caught) {
      acquiredMicrophone?.getTracks().forEach(track => track.stop());
      closeConnection();
      setRemote(null);
      setCallStatus(null);
      setError(caught instanceof Error ? caught.message : 'Could not connect the voice call.');
    } finally {
      setCalling(false);
    }
  }

  async function endCall() {
    const id = room.call?.id ?? connection.current?.id;
    closeConnection();
    setRemote(null);
    setCallStatus(null);
    if (!id) return;
    try { applyRoom(await post<Room>({ action: 'end', id })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not end the call.'); }
  }

  const incoming = room.call && room.call.caller !== user.uid && !room.call.answer && !connection.current;
  return (
    <section className="space-y-3 rounded-card border border-studio-border bg-white p-4 text-studio-ink">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><MessageCircle aria-hidden="true" className="size-4" /> Contact {counterpart}</h2>
      <div className="flex flex-wrap items-center gap-2">
        {incoming ? <>
          <VeyroButton size="sm" loading={calling} onClick={() => void connect(room.call!)}>Answer voice call</VeyroButton>
          <VeyroButton size="sm" variant="secondary" disabled={calling} onClick={() => void endCall()}>Decline</VeyroButton>
        </> : room.call || callStatus === 'Voice call connected' ? (
          <VeyroButton size="sm" variant="secondary" disabled={calling} onClick={() => void endCall()}>
            <PhoneOff aria-hidden="true" className="size-4" /> End call
          </VeyroButton>
        ) : (
          <VeyroButton size="sm" variant="secondary" loading={calling} onClick={() => void connect()}>
            <Phone aria-hidden="true" className="size-4" /> Voice call
          </VeyroButton>
        )}
        {callStatus ? <span role="status" className="text-xs">{callStatus}</span> : null}
      </div>
      {remote ? <audio ref={audio} autoPlay controls aria-label="Trip call audio" className="w-full" /> : null}
      {error ? <FormAlert tone="warning" title="Trip contact">{error}</FormAlert> : null}
      <div ref={scrollArea} role="log" aria-label="Trip messages" className="max-h-56 space-y-2 overflow-auto rounded-panel bg-studio-bg p-3">
        {room.messages.length ? room.messages.map(message => (
          <div key={message.uid + ':' + message.id} className={`w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm ${message.uid === user.uid ? 'ml-auto bg-studio-obsidian text-white' : 'bg-white'}`}>
            <span className="sr-only">{message.uid === user.uid ? 'You' : counterpart}: </span>{message.text}
          </div>
        )) : <p className="text-sm text-studio-muted">No messages yet.</p>}
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={event => void sendMessage(event)}>
        <input aria-label="Trip message" placeholder="Write a message" value={draft} maxLength={1000}
          onChange={event => setDraft(event.target.value)} className="min-w-32 flex-1 rounded-control border border-studio-border bg-white px-3 text-sm" />
        <VeyroButton type="submit" size="sm" loading={sending} disabled={!draft.trim()}>Send</VeyroButton>
      </form>
    </section>
  );
}
