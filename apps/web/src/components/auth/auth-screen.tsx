'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CarFront,
  Check,
  Mail,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import type { RecaptchaVerifier } from 'firebase/auth';
import {
  AppShell,
  DemoBadge,
  Field,
  FormAlert,
  Input,
  OtpInput,
  VeyroButton,
} from '@veyro/ui';
import {
  authErrorMessage,
  completeEmailLink,
  createPhoneRecaptcha,
  getStoredReturnPath,
  hasPendingLinkCredential,
  sendEmailLink,
  sendSmsCode,
  signInWithGoogle,
} from '@/lib/auth/auth';
import { safeReturnPath } from '@/lib/auth/safe-return';
import { useSession } from '@/lib/auth/session-provider';
import type { PhoneConfirmation } from '@/lib/auth/types';
import { validateE164Phone, validateEmail } from '@/lib/validation';
import { normalizeAuthError } from './auth-utils';

type Method = 'email' | 'phone';

export default function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, roleIntent, setRoleIntent, demoMode } = useSession();
  const [method, setMethod] = React.useState<Method>('email');
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const fallbackRoute = roleIntent === 'driver' ? '/onboarding/driver' : '/onboarding/customer';
  const returnTo = React.useMemo(
    () => safeReturnPath(searchParams.get('continue') ?? getStoredReturnPath(), fallbackRoute),
    [searchParams, fallbackRoute]
  );

  React.useEffect(() => {
    const role = searchParams.get('role');
    if (role === 'customer' || role === 'driver') {
      setRoleIntent(role);
    }
  }, [searchParams, setRoleIntent]);

  React.useEffect(() => {
    if (user) {
      router.replace(returnTo);
    }
  }, [user, returnTo, router]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setGlobalError(null);
    try {
      const signedInUser = await signInWithGoogle();
      if (!signedInUser) {
        setGlobalError('Redirecting to Google to finish sign-in…');
      }
    } catch (caught) {
      setGlobalError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AppShell theme="night">
      <div className="relative min-h-screen overflow-hidden bg-night-canvas">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-[#B8F23A]/[0.06] blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#FF2E93]/[0.08] blur-3xl" />
          <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(170,176,196,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(170,176,196,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        </div>

        <div className="relative mx-auto grid min-h-screen max-w-6xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-12">
          <section className="hidden lg:block">
            <div className="flex items-center gap-3">
              <DemoBadge />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-night-muted">
                Secure access
              </span>
            </div>
            <h1 className="mt-8 max-w-xl font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-night-text">
              Your ride starts with your identity.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-night-muted">
              No passwords to forget. Choose how Veyro verifies you, then get straight to the
              onboarding that matches how you use the road.
            </p>

            <div className="mt-10 rounded-card border border-night-border bg-night-glass p-6 shadow-glass backdrop-blur-xl">
              <svg
                aria-hidden="true"
                viewBox="0 0 420 120"
                className="h-24 w-full text-night-accent"
                fill="none"
              >
                <path
                  d="M12 96C86 96 76 24 154 24c70 0 56 72 132 72 52 0 62-36 122-36"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="veyro-route-line"
                />
                <circle cx="12" cy="96" r="7" fill="currentColor" />
                <circle cx="408" cy="60" r="7" fill="#FF2E93" />
                <circle cx="286" cy="96" r="5" fill="#F2F4FA" />
              </svg>
              <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="font-display text-sm font-bold text-night-text">Passwordless</p>
                  <p className="mt-1 text-night-muted">Link, OTP or Google</p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-night-text">One identity</p>
                  <p className="mt-1 text-night-muted">Providers link safely</p>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-night-text">Back to trip</p>
                  <p className="mt-1 text-night-muted">Return links preserved</p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-card p-5 shadow-glass sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-night-muted">
                Veyro ID
              </span>
              {demoMode ? <DemoBadge className="lg:hidden" /> : null}
              <Link
                href="/"
                className="text-xs font-medium text-night-muted underline-offset-4 hover:text-night-text hover:underline"
              >
                Back to home
              </Link>
            </div>

            <h2 className="mt-6 font-display text-3xl font-extrabold text-night-text">
              Sign in to Veyro
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-night-muted">
              Pick how you ride. We will take you to the right setup next.
            </p>

            <fieldset className="mt-7">
              <legend className="sr-only">Choose your role</legend>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  active={roleIntent !== 'driver'}
                  icon={<UserRound className="h-5 w-5" />}
                  title="Customer"
                  subtitle="I need a pro driver"
                  onClick={() => setRoleIntent('customer')}
                />
                <RoleCard
                  active={roleIntent === 'driver'}
                  icon={<CarFront className="h-5 w-5" />}
                  title="Driver"
                  subtitle="I provide the drive"
                  onClick={() => setRoleIntent('driver')}
                />
              </div>
            </fieldset>

            <div className="mt-7" role="group" aria-label="Sign-in method">
              <div className="grid grid-cols-2 gap-2 rounded-panel border border-night-border bg-night-glass p-1.5">
                <button
                  type="button"
                  aria-pressed={method === 'email'}
                  onClick={() => {
                    setMethod('email');
                    setGlobalError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-[0.7rem] px-3 py-2.5 text-sm font-semibold transition-colors ${
                    method === 'email'
                      ? 'bg-night-accent text-night-accent-ink'
                      : 'text-night-muted hover:text-night-text'
                  }`}
                >
                  <Mail aria-hidden="true" className="h-4 w-4" />
                  Email link
                </button>
                <button
                  type="button"
                  aria-pressed={method === 'phone'}
                  onClick={() => {
                    setMethod('phone');
                    setGlobalError(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-[0.7rem] px-3 py-2.5 text-sm font-semibold transition-colors ${
                    method === 'phone'
                      ? 'bg-night-accent text-night-accent-ink'
                      : 'text-night-muted hover:text-night-text'
                  }`}
                >
                  <Smartphone aria-hidden="true" className="h-4 w-4" />
                  Phone OTP
                </button>
              </div>
            </div>

            <div className="mt-6">
              {method === 'email' ? (
                <EmailForm returnTo={returnTo} demoMode={demoMode} />
              ) : (
                <PhoneForm />
              )}
            </div>

            {hasPendingLinkCredential() ? (
              <FormAlert tone="info" title="One last step" className="mt-5">
                Sign in with your existing method and we will link the new provider to the same Veyro
                identity automatically.
              </FormAlert>
            ) : null}

            {globalError ? (
              <FormAlert tone="error" title="Sign-in could not complete" className="mt-5">
                {globalError}
              </FormAlert>
            ) : null}

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-night-border" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-night-muted">
                or
              </span>
              <span className="h-px flex-1 bg-night-border" />
            </div>

            <VeyroButton
              type="button"
              variant="secondary"
              className="w-full"
              loading={googleLoading}
              onClick={handleGoogleSignIn}
            >
              <span aria-hidden="true" className="font-display font-bold text-night-text">
                G
              </span>
              Continue with Google
            </VeyroButton>

            <div className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-night-muted">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-night-accent" />
              <p>
                Passwordless by design. We never offer password login or password reset. By
                continuing you agree to the{' '}
                <Link href="/legal/terms" className="text-night-text underline underline-offset-2">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" className="text-night-text underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function RoleCard({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-panel border p-4 text-left transition-colors ${
        active
          ? 'border-night-accent bg-[#B8F23A]/10'
          : 'border-night-border bg-night-glass hover:border-night-muted'
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? 'bg-night-accent text-night-accent-ink' : 'bg-night-glass-strong text-night-text'}`}>
        {icon}
      </span>
      <span className="mt-3 flex items-center justify-between gap-2">
        <span className="font-display text-sm font-bold text-night-text">{title}</span>
        {active ? <Check aria-hidden="true" className="h-4 w-4 text-night-accent" /> : null}
      </span>
      <span className="mt-1 block text-xs text-night-muted">{subtitle}</span>
    </button>
  );
}

function EmailForm({ returnTo, demoMode }: { returnTo: string; demoMode: boolean }) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await sendEmailLink(email.trim(), returnTo);
      setSent(true);
      setCooldown(30);
    } catch (caught) {
      setError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setLoading(false);
    }
  }

  async function resendEmail() {
    setLoading(true);
    setError(null);
    try {
      await sendEmailLink(email.trim(), returnTo);
      setCooldown(30);
    } catch (caught) {
      setError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setLoading(false);
    }
  }

  async function openDemoLink() {
    setLoading(true);
    setError(null);
    try {
      await completeEmailLink(email.trim());
    } catch (caught) {
      setError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <FormAlert tone="success" title="Check your inbox">
          We sent a one-time sign-in link to <span className="font-semibold">{email}</span>. The link
          verifies your email and signs you in.
        </FormAlert>
        {demoMode ? (
          <VeyroButton type="button" className="w-full" loading={loading} onClick={openDemoLink}>
            Open demo sign-in link
          </VeyroButton>
        ) : null}
        <VeyroButton
          type="button"
          variant="ghost"
          className="w-full"
          loading={loading}
          disabled={cooldown > 0}
          onClick={resendEmail}
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend sign-in link'}
        </VeyroButton>
        {error ? <FormAlert tone="error" title="Could not send link">{error}</FormAlert> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submitEmail} className="space-y-5" noValidate>
      <Field
        id="auth-email"
        label="Email address"
        error={error ?? undefined}
        hint="We send a single-use link. No password is ever created."
      >
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          invalid={Boolean(error)}
          aria-describedby={error ? 'auth-email-error' : 'auth-email-hint'}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
      </Field>
      <VeyroButton type="submit" className="w-full" size="lg" loading={loading}>
        Send my sign-in link
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </VeyroButton>
    </form>
  );
}

function PhoneForm() {
  const { demoMode } = useSession();
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [confirmation, setConfirmation] = React.useState<PhoneConfirmation | null>(null);
  const [verifier, setVerifier] = React.useState<RecaptchaVerifier | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (demoMode) {
      return;
    }

    try {
      const created = createPhoneRecaptcha('phone-recaptcha');
      setVerifier(created);
      return () => created?.clear();
    } catch (caught) {
      setError(authErrorMessage(normalizeAuthError(caught)));
    }
  }, [demoMode]);

  React.useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestCode() {
    const validationError = validateE164Phone(phone);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setConfirmation(await sendSmsCode(phone.trim(), verifier));
      setCooldown(45);
    } catch (caught) {
      setError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation) {
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await confirmation.confirm(code);
    } catch (caught) {
      setError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {!confirmation ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void requestCode();
          }}
          className="space-y-5"
          noValidate
        >
          <Field
            id="auth-phone"
            label="Phone number"
            error={error ?? undefined}
            hint="Use international format, for example +919876543210."
          >
            <Input
              id="auth-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+919876543210"
              value={phone}
              invalid={Boolean(error)}
              aria-describedby={error ? 'auth-phone-error' : 'auth-phone-hint'}
              onChange={(event) => setPhone(event.currentTarget.value)}
            />
          </Field>
          <div id="phone-recaptcha" className="min-h-[78px]" />
          <VeyroButton type="submit" className="w-full" size="lg" loading={loading}>
            Send verification code
          </VeyroButton>
          <p className="text-xs leading-relaxed text-night-muted">
            Standard message and data rates may apply. Development test numbers must be configured
            in Firebase Auth.
            {demoMode ? ' Demo mode accepts any six-digit code.' : null}
          </p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-5" noValidate>
          <Field
            id="auth-otp"
            label="Six-digit code"
            error={error ?? undefined}
            hint={`We sent a code to ${phone}.`}
          >
            <OtpInput
              id="auth-otp"
              value={code}
              placeholder="000000"
              invalid={Boolean(error)}
              aria-describedby={error ? 'auth-otp-error' : 'auth-otp-hint'}
              onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
            />
          </Field>
          <VeyroButton type="submit" className="w-full" size="lg" loading={loading}>
            Verify and continue
          </VeyroButton>
          <VeyroButton
            type="button"
            variant="ghost"
            className="w-full"
            disabled={cooldown > 0 || loading}
            onClick={() => void requestCode()}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </VeyroButton>
        </form>
      )}
      {error && confirmation ? (
        <FormAlert tone="error" title="Verification failed">
          {error}
        </FormAlert>
      ) : null}
    </div>
  );
}
