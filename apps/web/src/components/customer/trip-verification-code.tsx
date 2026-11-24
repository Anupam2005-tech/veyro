'use client';

import { useEffect, useState } from 'react';
import { FormAlert, OtpVaultCard, VeyroButton } from '@veyro/ui';
import { requestTripVerificationCode } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/transport';
import type { AuthUser } from '@/lib/auth/types';

export function TripVerificationCode({ user, tripId, phase }: {
  user: AuthUser;
  tripId: string;
  phase: 'START' | 'END';
}) {
  const [issued, setIssued] = useState<{ code: string; validForMs: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = phase === 'START' ? 'Start OTP' : 'End OTP';

  useEffect(() => {
    if (!issued) return;
    const timer = window.setTimeout(() => {
      setIssued(null);
      setExpired(true);
    }, issued.validForMs);
    return () => window.clearTimeout(timer);
  }, [issued]);

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      const result = await requestTripVerificationCode(user, tripId, phase);
      const validForMs = Math.max(0, Math.min(300_000, result.expiresAt - (result.serverTime ?? Date.now())));
      if (!/^\d{6}$/.test(result.code) || !Number.isFinite(validForMs) || validForMs === 0) {
        throw new Error('The server did not return a usable code. Request a fresh code.');
      }
      setIssued({ code: result.code, validForMs });
      setExpired(false);
    } catch (caught) {
      setError(caught instanceof ApiClientError && caught.code === 'ROUTE_NOT_FOUND'
        ? 'This API version does not support trip codes. Update or restart the Veyro API.'
        : caught instanceof Error ? caught.message : 'Could not request a trip code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {issued ? <OtpVaultCard title={title} mode="display" code={issued.code} initiallyRevealed /> : null}
      <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
        {!issued ? <h3 className="font-display text-lg font-bold text-studio-ink">{title}</h3> : null}
        <p className="mt-1 text-sm text-studio-muted">
          {phase === 'START'
            ? 'Share this code with your assigned driver when you are ready to start.'
            : 'Share this separate code with your assigned driver when you are ready to end the trip.'}
        </p>
        <p className="mt-2 text-xs text-studio-muted">The code works once and expires within five minutes.</p>
        {expired ? <p role="status" className="mt-2 text-sm text-studio-muted">Code expired. Request a new one.</p> : null}
        {!issued ? (
          <VeyroButton type="button" size="sm" className="mt-3" loading={busy} onClick={() => void requestCode()}>
            {phase === 'START' ? 'Get start code' : 'Get end code'}
          </VeyroButton>
        ) : null}
      </section>
      {error ? <FormAlert tone="error" title="Code unavailable">{error}</FormAlert> : null}
    </div>
  );
}
