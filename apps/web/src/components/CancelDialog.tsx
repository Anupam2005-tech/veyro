'use client';

import { useState } from 'react';
import { apiWithMessage } from '@/lib/api';
import { humanize, inr } from '@/lib/format';
import { useAction, useApi } from '@/lib/hooks';
import type { Policy } from '@/lib/types';
import { Alert, Button, ErrorText, Field, Modal, Select, Textarea } from './ui';

export function CancelDialog({
  open,
  onClose,
  bookingId,
  role,
  feePreviewInr,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  role: 'CUSTOMER' | 'DRIVER';
  feePreviewInr?: number | null;
  onDone: (message: string) => void;
}) {
  const policy = useApi<Policy>(open ? '/bookings/policy' : null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, run } = useAction();
  const reasons = policy.data?.cancellationReasons[role] ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Cancel booking">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => apiWithMessage<{ feeInr: number }>(`/bookings/${bookingId}/cancel`, { body: { reason, note } }));
          if (r) onDone(r.message);
        }}
      >
        {role === 'CUSTOMER' ? (
          <Alert tone={feePreviewInr ? 'warning' : 'info'}>
            {feePreviewInr ? `A cancellation fee of ${inr(feePreviewInr)} applies if you cancel now.` : 'You can cancel now free of charge.'}
            {reason === 'DRIVER_LATE' ? ' If your driver has missed the arrival time, report a no-show instead. There is no charge for that.' : ''}
          </Alert>
        ) : (
          <Alert tone="info">We will let the customer know so they can book another driver.</Alert>
        )}
        <Field label="Reason">
          {(id) => (
            <Select id={id} required value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason</option>
              {reasons.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Details (optional)">{(id) => <Textarea id={id} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Keep booking</Button>
          <Button type="submit" variant="danger" busy={busy} disabled={!reason}>Cancel booking</Button>
        </div>
      </form>
    </Modal>
  );
}
