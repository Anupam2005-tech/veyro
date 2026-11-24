'use client';

import { useRef, useState } from 'react';
import { ConfirmDialog, FormAlert, VeyroButton } from '@veyro/ui';
import { payInvoice } from '@/lib/api/client';
import { paymentStatusMessage, type CheckoutStatus } from '@/lib/api/razorpay-checkout';
import type { AuthUser } from '@/lib/auth/types';

export function TripPaymentPrompt({ user, tripId, totalInr }: {
  user: AuthUser;
  tripId: string;
  totalInr: number;
}) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paying = useRef(false);
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalInr);

  async function pay() {
    if (paying.current) return;
    paying.current = true;
    setOpen(false);
    setBusy(true);
    setError(null);
    try {
      setStatus(await payInvoice(user, tripId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open Razorpay. Try again.');
    } finally {
      paying.current = false;
      setBusy(false);
    }
  }

  const canRetry = !status || status === 'READY' || status === 'FAILED';
  return (
    <>
      {canRetry ? (
        <VeyroButton type="button" loading={busy} onClick={() => setOpen(true)}>Pay {amount}</VeyroButton>
      ) : null}
      {status ? <FormAlert tone={status === 'CAPTURED' ? 'success' : 'info'} title="Payment status">{paymentStatusMessage(status)}</FormAlert> : null}
      {error ? <FormAlert tone="error" title="Payment update">{error}</FormAlert> : null}
      <ConfirmDialog open={open && canRetry} onOpenChange={setOpen} title="Trip complete"
        description={`Your final fare is ${amount}. Continue to Razorpay Test Mode to pay.`}
        confirmLabel={`Pay ${amount} with Razorpay`} cancelLabel="Pay later" onConfirm={() => void pay()} />
    </>
  );
}
