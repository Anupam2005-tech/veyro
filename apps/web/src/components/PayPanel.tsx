'use client';

import { useEffect, useRef, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { inr } from '@/lib/format';
import { useSession } from '@/lib/session';
import { Alert, Button, Card, ErrorText } from './ui';

interface Checkout {
  paymentId: string;
  status: string;
  mode: 'DEMO' | 'RAZORPAY_TEST';
  amountInr: number;
  razorpay: { keyId: string; orderId: string; amountPaise: number } | null;
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
    document.body.appendChild(s);
  });
}

/** Pays the server-calculated unpaid balance. The browser never sets the amount. */
export function PayPanel({ onPaid }: { onPaid?: () => void }) {
  const { me, refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'pending' | 'captured'>('idle');
  const keyRef = useRef<string>('');

  // The balance lives on the session snapshot; refresh it so charges created
  // moments ago (e.g. a just-completed trip) show up immediately.
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!me) return null;
  const due = me.outstandingBalanceInr;

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      // One idempotency key per attempt: double clicks reuse the same order.
      if (!keyRef.current) keyRef.current = `pay-${me!.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const order = await api<Checkout>('/payments/orders', { body: { idempotencyKey: keyRef.current } });
      if (order.mode === 'DEMO') {
        const r = await api<Checkout>(`/payments/${order.paymentId}/demo-capture`, { method: 'POST' });
        setState(r.status === 'CAPTURED' ? 'captured' : 'pending');
      } else {
        await loadRazorpay();
        await new Promise<void>((resolve) => {
          const rzp = new window.Razorpay!({
            key: order.razorpay!.keyId,
            order_id: order.razorpay!.orderId,
            amount: order.razorpay!.amountPaise,
            currency: 'INR',
            name: 'Veyro (test mode)',
            description: 'Trip fare',
            prefill: { email: me!.email, contact: me!.phone },
            theme: { color: '#0F766E' },
            handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
              try {
                const v = await api<Checkout>('/payments/verify', { body: { paymentId: order.paymentId, ...resp } });
                setState(v.status === 'CAPTURED' ? 'captured' : 'pending');
              } catch (e) {
                setError(errorMessage(e));
              }
              resolve();
            },
            modal: { ondismiss: () => resolve() },
          });
          rzp.open();
        });
      }
      keyRef.current = '';
      await refresh();
      onPaid?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <p className="flex items-center gap-2 text-base font-semibold"><CreditCard className="h-5 w-5" aria-hidden /> Payment</p>
      {state === 'captured' && due === 0 ? <Alert tone="success" title="Payment received">Thank you. You can make new bookings again.</Alert> : null}
      {state === 'pending' ? <Alert tone="pending" title="Payment verification pending">We are waiting for confirmation from Razorpay. This page will update once it arrives.</Alert> : null}
      {due > 0 ? (
        <>
          <p className="text-sm">Amount due: <strong className="text-xl font-semibold">{inr(due)}</strong></p>
          <Button size="lg" className="w-full" busy={busy} onClick={() => void pay()}>Pay {inr(due)}</Button>
          <p className="text-xs text-studio-muted">Payments run in test mode and no real money is charged. Amounts under dispute are not included.</p>
        </>
      ) : state !== 'captured' ? (
        <p className="text-sm text-studio-muted">Nothing to pay right now.</p>
      ) : null}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}
