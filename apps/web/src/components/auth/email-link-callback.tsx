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
      <div className="min-h-screen bg-night-canvas">
        <div className="mx-auto grid min-h-screen max-w-content gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,34rem)] lg:items-center lg:gap-16 lg:px-8">
          <section className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-night-muted">
                Veyro ID
              </span>
              {demoMode ? <DemoBadge /> : null}
            </div>
            <h1 className="mt-8 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-night-text sm:text-5xl">
              {status === 'signing-in'
                ? 'Confirming your link'
                : status === 'error'
                  ? 'That link needs another look'
                  : needsEmail
                    ? 'One quick confirmation'
                    : 'Signing you in'}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-night-muted">
              {status === 'signing-in'
                ? 'We are verifying this one-time link and preparing your Veyro space.'
                : status === 'error'
                  ? 'The link may have expired or already been used.'
                  : needsEmail
                    ? 'Enter the email address where you received the sign-in link.'
                    : 'You will be redirected automatically.'}
            </p>
            <div className="mt-10 rounded-card border border-night-border bg-night-surface p-6">
              <svg
                aria-hidden="true"
                viewBox="0 0 420 120"
                className="h-20 w-full text-night-accent"
                fill="none"
              >
                <path
                  d="M12 96C86 96 76 24 154 24c70 0 56 72 132 72 52 0 62-36 122-36"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="96" r="7" fill="currentColor" />
                <circle cx="408" cy="60" r="7" fill="#FF2E93" />
                <circle cx="286" cy="96" r="5" fill="#F2F4FA" />
              </svg>
            </div>
          </section>

          <section className="rounded-card border border-night-border bg-night-surface p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-control bg-night-accent text-night-accent-ink">
              {status === 'signing-in' ? (
                <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />
              ) : status === 'error' ? (
                <Mail aria-hidden="true" className="h-5 w-5" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              )}
            </div>

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

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-night-border pt-6 text-xs text-night-muted">
              <Link href="/auth" className="text-night-text underline underline-offset-4">
                Request a new link
              </Link>
              <Link href="/" className="underline underline-offset-4">
                Back to home
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
