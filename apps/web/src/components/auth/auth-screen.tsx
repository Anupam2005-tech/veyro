'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { AppShell, DemoBadge, FormAlert } from '@veyro/ui';
import {
  authErrorMessage,
  getStoredReturnPath,
  hasPendingLinkCredential,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/lib/auth/auth';
import { adminReturnPath, safeReturnPath } from '@/lib/auth/safe-return';
import { useSession } from '@/lib/auth/session-provider';
import { validateEmail } from '@/lib/validation';
import { normalizeAuthError } from './auth-utils';

type AuthMode = 'signin' | 'signup' | 'reset';

export interface AuthScreenProps {
  role?: 'customer' | 'driver' | 'admin';
}

export default function AuthScreen({ role = 'customer' }: AuthScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, setRoleIntent, demoMode, error: sessionError, refreshProfile, signOut } = useSession();

  const searchRole = searchParams.get('role');
  const effectiveRole = role === 'admin' ? 'admin' : (searchRole === 'driver' || searchRole === 'admin' || searchRole === 'customer')
    ? searchRole
    : role;

  const searchMode = searchParams.get('mode');
  const initialMode: AuthMode =
    searchMode === 'signup'
      ? 'signup'
      : searchMode === 'reset' || searchMode === 'forgot-password'
      ? 'reset'
      : 'signin';

  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const isDriver = effectiveRole === 'driver';
  const isAdmin = effectiveRole === 'admin';
  const fallbackRoute = isAdmin ? '/admin' : isDriver ? '/driver' : '/customer';

  const returnTo = React.useMemo(
    () => {
      const explicit = searchParams.get('continue') ?? searchParams.get('returnTo');
      return isAdmin ? adminReturnPath(explicit) : safeReturnPath(explicit ?? getStoredReturnPath(), fallbackRoute);
    },
    [searchParams, fallbackRoute, isAdmin]
  );

  React.useEffect(() => {
    if (effectiveRole === 'driver' || effectiveRole === 'customer') {
      setRoleIntent(effectiveRole);
    }
  }, [effectiveRole, setRoleIntent]);

  React.useEffect(() => {
    if (!user || loading) return;

    if (isAdmin) {
      router.replace(returnTo);
      return;
    }

    if (profile && !profile.onboardingComplete) {
      router.replace(
        isDriver || profile.role === 'DRIVER'
          ? '/onboarding/driver'
          : '/onboarding/customer'
      );
      return;
    }

    if (profile) {
      router.replace(returnTo);
    }
  }, [user, profile, loading, isAdmin, isDriver, returnTo, router]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setGlobalError(null);
    try {
      const signedInUser = await signInWithGoogle();
      if (!signedInUser) {
        setGlobalError('Redirecting to Google…');
      }
    } catch (caught) {
      setGlobalError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AppShell theme="studio" className="bg-[#FAF8F4] text-[#0B0D12] antialiased">
      <div className="min-h-screen w-full flex flex-col lg:flex-row">
        {/* =====================================================================
            LEFT COLUMN — ULTRA-MINIMAL LIGHT FORM CANVAS
            ===================================================================== */}
        <section className="relative z-10 w-full lg:w-[45%] xl:w-[42%] min-h-screen bg-white flex flex-col justify-between px-6 py-7 sm:px-12 sm:py-10 lg:px-14 border-r border-black/[0.06]">
          {/* Top Bar */}
          <header className="flex items-center justify-between">
            <Link
              href="/"
              aria-label="Veyro Home"
              className="inline-flex items-center transition-opacity hover:opacity-70"
            >
              <Image
                src="/brand/veyro-light-logo-trimmed.png"
                alt="Veyro"
                width={108}
                height={30}
                className="h-6 w-auto object-contain"
                priority
              />
            </Link>

            {!isDriver ? (
              <div className="flex items-center gap-2.5">
                {demoMode ? <DemoBadge /> : null}
                <Link
                  href="/"
                  className="group inline-flex items-center gap-1 text-xs font-semibold text-[#666C7C] transition-colors hover:text-[#0B0D12]"
                >
                  <span>Home</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            ) : null}
          </header>

          {/* Center Form */}
          <div className="my-auto py-12 w-full max-w-[380px] mx-auto">
            {/* Minimal Role Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[#FAF8F4] px-3 py-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: isAdmin ? '#0284C7' : '#84CC16' }}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#0B0D12]">
                {isAdmin ? 'Admin' : isDriver ? 'Chauffeur' : 'Private Pass'}
              </span>
            </div>

            {/* Punchy Headline (No wall of text) */}
            <h1 className="mt-4 font-display text-3xl sm:text-[38px] font-black leading-[1.04] tracking-[-0.035em] text-[#0B0D12]">
              {mode === 'reset'
                ? 'Reset key.'
                : isAdmin
                ? 'Command deck.'
                : isDriver
                ? mode === 'signup'
                  ? 'Take the wheel.'
                  : 'Back on duty.'
                : mode === 'signup'
                ? 'Claim your pass.'
                : 'Welcome back.'}
            </h1>

            {/* Segmented Mode Switcher */}
            {!isAdmin && mode !== 'reset' ? (
              <div
                className="mt-7 grid grid-cols-2 rounded-xl bg-[#F4F1EA] p-1"
                role="tablist"
                aria-label="Authentication mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => {
                    setMode('signin');
                    setGlobalError(null);
                  }}
                  className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
                    mode === 'signin'
                      ? 'bg-white text-[#0B0D12] shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                      : 'text-[#6B7280] hover:text-[#0B0D12]'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => {
                    setMode('signup');
                    setGlobalError(null);
                  }}
                  className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
                    mode === 'signup'
                      ? 'bg-white text-[#0B0D12] shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                      : 'text-[#6B7280] hover:text-[#0B0D12]'
                  }`}
                >
                  Create account
                </button>
              </div>
            ) : null}

            {/* Email + Password Form */}
            <div className="mt-6">
              <EmailPasswordForm
                mode={mode}
                isDriver={isDriver}
                isAdmin={isAdmin}
                onModeChange={(next) => {
                  setMode(next);
                  setGlobalError(null);
                }}
              />
            </div>

            {hasPendingLinkCredential() ? (
              <FormAlert
                tone="info"
                title="One last step"
                className="mt-4 border-[#CCE7FF] bg-[#F0F7FF] text-[#034488]"
              >
                Sign in to link your new provider automatically.
              </FormAlert>
            ) : null}

            {globalError ? (
              <FormAlert
                tone="error"
                title="Sign-in failed"
                className="mt-4 border-[#FFD0D8] bg-[#FFF0F3] text-[#A6002A]"
              >
                {globalError}
              </FormAlert>
            ) : null}

            {sessionError ? (
              <div className="mt-4 rounded-xl border border-[#FFD0D8] bg-[#FFF0F3] p-4 text-xs text-[#A6002A] space-y-2">
                <p className="font-bold text-[#80001C]">Session Verification Issue</p>
                <p>{sessionError}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void refreshProfile()}
                    className="px-3 py-1.5 rounded-lg bg-[#A6002A] text-white font-medium hover:bg-black transition-colors"
                  >
                    Retry Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="px-3 py-1.5 rounded-lg border border-[#FFCCD5] text-[#80001C] font-medium hover:bg-[#FFE0E6] transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : null}

            {user && loading ? (
              <div className="mt-4 flex items-center justify-center gap-2.5 rounded-xl border border-black/[0.08] bg-[#FAF8F4] p-3 text-xs text-[#6B7280]">
                <span className="h-2 w-2 rounded-full bg-[#84CC16] animate-ping" />
                <span>Verifying credentials &amp; loading profile…</span>
              </div>
            ) : null}

            {/* Google OAuth */}
            {mode !== 'reset' ? (
              <>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-black/[0.07]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9CA3AF]">
                    or
                  </span>
                  <span className="h-px flex-1 bg-black/[0.07]" />
                </div>

                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full h-11 rounded-xl border border-black/[0.1] bg-white text-[#0B0D12] transition-all duration-200 hover:border-black/25 hover:bg-[#FAF8F4] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5 text-sm font-semibold"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>{googleLoading ? 'Connecting…' : 'Continue with Google'}</span>
                </button>
              </>
            ) : null}
          </div>

          {/* Ultra-Minimal Footer */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-5 text-xs text-[#6B7280]">
            {isDriver ? (
              <Link
                href="/auth"
                className="group inline-flex items-center gap-1.5 font-semibold text-[#0B0D12] hover:opacity-75 transition-opacity"
              >
                <span>Client Sign In</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <Link
                href="/auth/driver"
                className="group inline-flex items-center gap-1.5 font-semibold text-[#0B0D12] hover:opacity-75 transition-opacity"
              >
                <span>Chauffeur Portal</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}

            <div className="flex items-center gap-3 text-[11px]">
              <Link href="/legal/terms" className="hover:text-[#0B0D12] transition-colors">
                Terms
              </Link>
              <span className="text-black/20">·</span>
              <Link href="/legal/privacy" className="hover:text-[#0B0D12] transition-colors">
                Privacy
              </Link>
            </div>
          </footer>
        </section>

        {/* =====================================================================
            RIGHT COLUMN — EDITORIAL LUXURY STAGE
            ===================================================================== */}
        <section
          className={`relative hidden lg:flex flex-1 flex-col justify-between overflow-hidden p-12 xl:p-16 select-none ${
            isDriver
              ? 'bg-black text-white'
              : 'bg-gradient-to-br from-[#F7F4EC] via-[#F2EDE1] to-[#EAE3D3]'
          }`}
        >
          {isDriver ? (
            <>
              <Image
                src="/img5.jpeg"
                alt="Veyro Chauffeur Luxury"
                fill
                priority
                className="object-cover object-center filter brightness-[0.62] contrast-[1.18]"
              />
              {/* Cinematic Vignette & Gradient Overlays */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/75" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
            </>
          ) : (
            <>
              {/* Fine Architectural Grid */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.45]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(11,13,18,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,13,18,0.05) 1px, transparent 1px)',
                  backgroundSize: '44px 44px',
                }}
              />

              {/* Soft Sunlit Editorial Blooms */}
              <div
                className="pointer-events-none absolute -top-28 -right-24 h-[460px] w-[460px] rounded-full blur-[110px]"
                style={{
                  backgroundColor: isAdmin
                    ? 'rgba(56, 189, 248, 0.22)'
                    : 'rgba(184, 242, 58, 0.28)',
                }}
              />
              <div className="pointer-events-none absolute -bottom-36 -left-20 h-[420px] w-[420px] rounded-full bg-white/70 blur-[100px]" />
            </>
          )}

          {/* Top Editorial Bar */}
          <div
            className={`relative z-10 flex items-center justify-between pb-5 border-b ${
              isDriver ? 'border-white/10' : 'border-black/[0.08]'
            }`}
          >
            <div className="inline-flex items-center gap-2.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: isAdmin ? '#0284C7' : isDriver ? '#B8F23A' : '#84CC16',
                }}
              />
              <span
                className={`font-mono text-[11px] font-semibold uppercase tracking-[0.26em] ${
                  isDriver ? 'text-white' : 'text-[#0B0D12]'
                }`}
              >
                {isDriver ? 'VEYRO // CHAUFFEUR PROTOCOL' : 'VEYRO // MOBILITY'}
              </span>
            </div>
            <span
              className={`font-mono text-[11px] uppercase tracking-[0.22em] ${
                isDriver ? 'text-[#B8F23A]' : 'text-[#6B7280]'
              }`}
            >
              {isAdmin ? 'OPS TIER' : isDriver ? 'PARTNER TIER · 0% COMMISSION' : 'MEMBER TIER'}
            </span>
          </div>

          {/* Center Editorial Showcase */}
          <div className="relative z-10 my-auto py-8 max-w-[540px]">
            {isAdmin ? (
              <AdminShowcase />
            ) : isDriver ? (
              <DriverShowcase />
            ) : (
              <CustomerShowcase />
            )}
          </div>

          {/* Bottom Telemetry Strip */}
          <div
            className={`relative z-10 flex items-center justify-between pt-5 border-t ${
              isDriver ? 'border-white/10' : 'border-black/[0.08]'
            }`}
          >
            <div
              className={`flex items-center gap-7 font-mono text-[11px] ${
                isDriver ? 'text-white/70' : 'text-[#5B6170]'
              }`}
            >
              {isAdmin ? (
                <>
                  <span>
                    <strong className="text-[#0B0D12]">LIVE</strong> AUDIT
                  </span>
                  <span>
                    <strong className="text-[#0B0D12]">ZERO</strong> DRIFT
                  </span>
                </>
              ) : isDriver ? (
                <>
                  <span>
                    <strong className="text-[#B8F23A]">0%</strong> COMMISSION
                  </span>
                  <span>
                    <strong className="text-white">INSTANT</strong> UPI
                  </span>
                  <span>
                    <strong className="text-white">PRIVATE</strong> ASSETS ONLY
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <strong className="text-[#0B0D12]">0×</strong> SURGE
                  </span>
                  <span>
                    <strong className="text-[#0B0D12]">15 KM</strong> REACH
                  </span>
                  <span>
                    <strong className="text-[#0B0D12]">100%</strong> VETTED
                  </span>
                </>
              )}
            </div>
            <span
              className={`font-mono text-[11px] tracking-wider ${
                isDriver ? 'text-white/50' : 'text-[#7C8292]'
              }`}
            >
              © {new Date().getFullYear()} VEYRO
            </span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/* ============================================================================
   EMAIL & PASSWORD FORM
   ============================================================================ */
function EmailPasswordForm({
  mode,
  isDriver,
  isAdmin,
  onModeChange,
}: {
  mode: AuthMode;
  isDriver: boolean;
  isAdmin: boolean;
  onModeChange: (next: AuthMode) => void;
}) {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetSent, setResetSent] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    setError(null);
    setResetSent(false);
  }, [mode]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((val) => Math.max(0, val - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleReset(targetEmail: string) {
    const emailError = validateEmail(targetEmail);
    if (emailError) {
      setError(emailError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(targetEmail.trim());
      setResetSent(true);
      setCooldown(30);
    } catch (caught) {
      setError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (mode === 'reset') {
      await handleReset(email);
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password, fullName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (caught) {
      setError(authErrorMessage(normalizeAuthError(caught)));
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'reset' && resetSent) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#16A34A]/25 bg-[#F0FDF4] p-4 text-xs font-medium text-[#14532D]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-white">
              <Check className="h-3 w-3" />
            </span>
            <span className="font-bold text-sm">Reset link dispatched</span>
          </div>
          <p className="mt-2 text-[#166534] leading-relaxed">
            We sent instructions to <strong className="text-[#0B0D12]">{email}</strong>. Check your inbox and spam folder to set your new password.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-xs font-medium text-[#DC2626]">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={() => void handleReset(email)}
            className="flex-1 h-10 rounded-xl border border-black/[0.1] bg-white text-xs font-semibold text-[#0B0D12] hover:bg-[#FAF8F4] transition-colors disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
          </button>
          <button
            type="button"
            onClick={() => {
              setResetSent(false);
              setError(null);
            }}
            className="px-3 h-10 text-xs font-medium text-[#6B7280] hover:text-[#0B0D12] transition-colors"
          >
            Change email
          </button>
        </div>

        <button
          type="button"
          onClick={() => onModeChange('signin')}
          className="w-full h-11 rounded-xl bg-[#0B0D12] text-white hover:bg-black transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-[0_4px_14px_rgba(11,13,18,0.12)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to sign in</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {mode === 'reset' ? (
        <p className="text-xs text-[#6B7280] leading-relaxed pb-1">
          Enter the email address registered with your account to receive a secure password reset link.
        </p>
      ) : null}

      {mode === 'signup' ? (
        <div>
          <label
            htmlFor="auth-fullname"
            className="block text-xs font-semibold text-[#0B0D12]"
          >
            Full Name
          </label>
          <input
            id="auth-fullname"
            type="text"
            autoComplete="name"
            placeholder={
              isDriver
                ? 'Arjun Sharma (as on Driving License)'
                : 'Arjun Sharma'
            }
            value={fullName}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              setFullName(e.currentTarget.value);
              if (error) setError(null);
            }}
            className="mt-1.5 w-full h-11 rounded-xl border border-black/[0.11] bg-[#FCFBF8] px-3.5 text-sm text-[#0B0D12] placeholder:text-[#9CA3AF] transition-all focus:border-[#0B0D12] focus:bg-white focus:outline-none focus:ring-4 focus:ring-black/[0.05]"
          />
        </div>
      ) : null}

      <div>
        <label
          htmlFor="auth-email"
          className="block text-xs font-semibold text-[#0B0D12]"
        >
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={
            isAdmin
              ? 'ops@veyro.com'
              : isDriver
              ? 'chauffeur@veyro.com'
              : 'you@domain.com'
          }
          value={email}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            setEmail(e.currentTarget.value);
            if (error) setError(null);
          }}
          className="mt-1.5 w-full h-11 rounded-xl border border-black/[0.11] bg-[#FCFBF8] px-3.5 text-sm text-[#0B0D12] placeholder:text-[#9CA3AF] transition-all focus:border-[#0B0D12] focus:bg-white focus:outline-none focus:ring-4 focus:ring-black/[0.05]"
        />
      </div>

      {mode !== 'reset' ? (
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold text-[#0B0D12]"
            >
              Password
            </label>
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => onModeChange('reset')}
                className="text-xs font-medium text-[#6B7280] transition-colors hover:text-[#0B0D12]"
              >
                Forgot password?
              </button>
            ) : null}
          </div>

          <div className="relative mt-1.5">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              value={password}
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                setPassword(e.currentTarget.value);
                if (error) setError(null);
              }}
              className="w-full h-11 rounded-xl border border-black/[0.11] bg-[#FCFBF8] pl-3.5 pr-10 text-sm text-[#0B0D12] placeholder:text-[#9CA3AF] transition-all focus:border-[#0B0D12] focus:bg-white focus:outline-none focus:ring-4 focus:ring-black/[0.05]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8A90A0] transition-colors hover:text-[#0B0D12]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'signup' ? (
        <div>
          <label
            htmlFor="auth-confirm-password"
            className="block text-xs font-semibold text-[#0B0D12]"
          >
            Confirm Password
          </label>
          <div className="relative mt-1.5">
            <input
              id="auth-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirmPassword}
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                setConfirmPassword(e.currentTarget.value);
                if (error) setError(null);
              }}
              className="w-full h-11 rounded-xl border border-black/[0.11] bg-[#FCFBF8] pl-3.5 pr-10 text-sm text-[#0B0D12] placeholder:text-[#9CA3AF] transition-all focus:border-[#0B0D12] focus:bg-white focus:outline-none focus:ring-4 focus:ring-black/[0.05]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8A90A0] transition-colors hover:text-[#0B0D12]"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="text-xs font-medium text-[#DC2626]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="group w-full h-11 rounded-xl bg-[#0B0D12] text-white transition-all duration-200 hover:bg-black hover:shadow-[0_10px_24px_rgba(11,13,18,0.16)] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-bold"
      >
        <span>
          {loading
            ? mode === 'reset'
              ? 'Sending reset link…'
              : mode === 'signup'
              ? 'Creating account…'
              : 'Signing in…'
            : mode === 'reset'
            ? 'Send reset link'
            : mode === 'signup'
            ? isDriver
              ? 'Create Chauffeur Account'
              : 'Create Account'
            : 'Sign in'}
        </span>
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 text-[#B8F23A] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </button>

      {mode === 'reset' ? (
        <button
          type="button"
          onClick={() => onModeChange('signin')}
          className="w-full py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#0B0D12] transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to sign in</span>
        </button>
      ) : (
        <div className="pt-2 text-center text-xs text-[#6B7280]">
          {mode === 'signin' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => onModeChange('signup')}
                className="font-semibold text-[#0B0D12] underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Create one
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onModeChange('signin')}
                className="font-semibold text-[#0B0D12] underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      )}
    </form>
  );
}

/* ============================================================================
   RIGHT PANEL — LIGHT EDITORIAL SHOWCASES
   ============================================================================ */
function CustomerShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-4xl xl:text-[54px] font-black leading-[1.02] tracking-[-0.035em] text-[#0B0D12]">
          Your car.{' '}
          <span className="inline-block bg-[#B8F23A] px-2.5 py-0.5 rounded-lg">
            Zero surge.
          </span>
        </h2>
        <p className="mt-4 text-base text-[#525866] leading-relaxed max-w-md">
          Why pay 4× for a beat-up cab when your own cabin is better? Vetted chauffeurs on demand.
        </p>
      </div>

      {/* Tactile Light Porcelain Member Card */}
      <div className="relative overflow-hidden rounded-3xl border border-black/[0.08] bg-white/85 p-7 backdrop-blur-xl shadow-[0_24px_60px_rgba(11,13,18,0.08)]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-[#B8F23A]/30 blur-3xl" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/veyro-light-logo-trimmed.png"
              alt="Veyro"
              width={86}
              height={24}
              className="h-5 w-auto object-contain"
            />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
              MEMBER PASS
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0B0D12] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#B8F23A]">
            <Sparkles className="h-3 w-3" />
            UNRESTRICTED
          </span>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-black/[0.07] pt-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8A90A0]">
              Cabin
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#0B0D12]">
              <KeyRound className="h-3.5 w-3.5" />
              Your Keys
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8A90A0]">
              Vetting
            </p>
            <p className="mt-1 text-sm font-bold text-[#0B0D12]">Police Audited</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8A90A0]">
              Billing
            </p>
            <p className="mt-1 text-sm font-bold text-[#0B0D12]">Flat Hourly</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3.5 py-1 text-xs font-mono font-semibold tracking-wider text-[#B8F23A] backdrop-blur-md">
          01 // CHAUFFEUR PROTOCOL
        </span>
        <h2 className="mt-4 font-display text-4xl xl:text-[54px] font-black leading-[1.02] tracking-[-0.035em] text-white">
          Finest cars.{' '}
          <span className="inline-block bg-[#B8F23A] text-black px-3 py-0.5 rounded-lg">
            100% yours.
          </span>
        </h2>
        <p className="mt-4 text-base text-white/85 leading-relaxed max-w-md font-light">
          Zero EMIs. Zero fuel bills. Zero platform cuts. Take the wheel of private luxury fleets and collect instant UPI payouts.
        </p>
      </div>

      {/* High-craft Chauffeur Credential Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/60 p-7 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-[#B8F23A]/20 blur-3xl" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8F23A]">
              CHAUFFEUR CREDENTIAL
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-3 py-1 font-mono text-[10px] font-bold text-[#B8F23A]">
            <Star className="h-3 w-3 fill-current" />
            5.0 VERIFIED
          </span>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
              Take-home
            </p>
            <p className="mt-1 text-sm font-bold text-white">100% Fare</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
              Payout
            </p>
            <p className="mt-1 text-sm font-bold text-white">Instant UPI</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
              Status
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-[#84CC16] animate-pulse" />
              Ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-4xl xl:text-[54px] font-black leading-[1.02] tracking-[-0.035em] text-[#0B0D12]">
          Zero drift.{' '}
          <span className="inline-block bg-[#E0F2FE] text-[#0369A1] px-2.5 py-0.5 rounded-lg">
            Full control.
          </span>
        </h2>
        <p className="mt-4 text-base text-[#525866] leading-relaxed max-w-md">
          Vetting, incident resolution, and real-time operational governance under immutable logs.
        </p>
      </div>

      {/* Tactile Light Ops Clearance Card */}
      <div className="relative overflow-hidden rounded-3xl border border-black/[0.08] bg-white/85 p-7 backdrop-blur-xl shadow-[0_24px_60px_rgba(11,13,18,0.08)]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-[#38BDF8]/25 blur-3xl" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/veyro-light-logo-trimmed.png"
              alt="Veyro"
              width={86}
              height={24}
              className="h-5 w-auto object-contain"
            />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
              OPS CLEARANCE
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0B0D12] px-3 py-1 font-mono text-[10px] font-bold text-[#38BDF8]">
            <ShieldCheck className="h-3 w-3" />
            OPERATIONS
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-black/[0.07] pt-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8A90A0]">
              Access
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-[#0B0D12]">
              <span className="h-2 w-2 rounded-full bg-[#0284C7] animate-pulse" />
              Full Admin
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#8A90A0]">
              Audit
            </p>
            <p className="mt-1 text-sm font-bold text-[#0B0D12]">Immutable Logs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
