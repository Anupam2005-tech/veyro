'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, LoaderCircle, Mail } from 'lucide-react';
import {
  AppShell,
  DemoBadge,
  Field,
  FormAlert,
  Input,
  VeyroButton,
} from '@veyro/ui';
import {
  authErrorMessage,
  completeEmailLink,
  getStoredReturnPath,
  getStoredSignInEmail,
  isEmailLinkSignIn,
} from '@/lib/auth/auth';
import { safeReturnPath } from '@/lib/auth/safe-return';
import { useSession } from '@/lib/auth/session-provider';
import { validateEmail } from '@/lib/validation';
import { normalizeAuthError } from './auth-utils';

type Status = 'checking' | 'signing-in' | 'ready' | 'error';

export default function EmailLinkCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { roleIntent, demoMode } = useSession();
  const [status, setStatus] = React.useState<Status>('checking');
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = React.useState(false);
  const started = React.useRef(false);

  const returnTo = React.useMemo(
    () =>
      safeReturnPath(
        searchParams.get('continue') ?? getStoredReturnPath(),
        roleIntent === 'driver' ? '/onboarding/driver' : '/onboarding/customer'
      ),
    [searchParams, roleIntent]
  );

  const finishSignIn = React.useCallback(
    async (value: string) => {
      setStatus('signing-in');
      setError(null);
      try {
        await completeEmailLink(value);
        setStatus('ready');
        router.replace(returnTo);
      } catch (caught) {
        setStatus('error');
        setError(authErrorMessage(normalizeAuthError(caught)));
      }
    },
    [router, returnTo]
  );

  React.useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    if (!isEmailLinkSignIn()) {
      setStatus('error');
      setError('This is not a valid Veyro sign-in link. Request a new one from the sign-in page.');
      return;
    }

    const initialEmail = searchParams.get('email') ?? getStoredSignInEmail();
    if (!initialEmail) {
      setNeedsEmail(true);
      setStatus('ready');
      return;
    }

    setEmail(initialEmail);
    void finishSignIn(initialEmail);
  }, [searchParams, finishSignIn]);

  return (
    <AppShell theme="night">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-night-canvas px-5 py-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#B8F23A]/[0.07] blur-3xl" />
        </div>

        <section className="glass-panel relative w-full max-w-lg rounded-card p-6 shadow-glass sm:p-9">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-night-muted">
              Veyro ID
            </span>
            {demoMode ? <DemoBadge /> : null}
          </div>

          <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-night-accent text-night-accent-ink">
            {status === 'signing-in' ? (
              <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />
            ) : status === 'error' ? (
              <Mail aria-hidden="true" className="h-5 w-5" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
            )}
          </div>

          <h1 className="mt-6 font-display text-3xl font-extrabold text-night-text">
            {status === 'signing-in'
              ? 'Confirming your link'
              : status === 'error'
                ? 'That link needs another look'
                : needsEmail
                  ? 'One quick confirmation'
                  : 'Signing you in'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-night-muted">
            {status === 'signing-in'
              ? 'We are verifying this one-time link and preparing your Veyro space.'
              : status === 'error'
                ? 'The link may have expired or already been used.'
                : needsEmail
                  ? 'Enter the email address where you received the sign-in link.'
                  : 'You will be redirected automatically.'}
          </p>

          {needsEmail && status !== 'error' ? (
            <form
              className="mt-7 space-y-5"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const validationError = validateEmail(email);
                if (validationError) {
                  setError(validationError);
                  setStatus('error');
                  return;
                }
                void finishSignIn(email.trim());
              }}
            >
              <Field id="callback-email" label="Email address" error={error ?? undefined}>
                <Input
                  id="callback-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  placeholder="you@example.com"
                  aria-describedby={error ? 'callback-email-error' : undefined}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                />
              </Field>
              <VeyroButton type="submit" className="w-full" size="lg">
                Confirm and continue
              </VeyroButton>
            </form>
          ) : null}

          {status === 'error' && error ? (
            <FormAlert tone="error" title="Sign-in link error" className="mt-7">
              {error}
            </FormAlert>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-night-muted">
            <Link href="/auth" className="text-night-text underline underline-offset-4">
              Request a new link
            </Link>
            <Link href="/" className="underline underline-offset-4">
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
