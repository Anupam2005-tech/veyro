'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { homeFor, useSession } from '@/lib/session';
import type { Me } from '@/lib/types';

const SHOW_TEST_ACCOUNTS = process.env.NODE_ENV !== 'production';

const DEMO_ACCOUNTS: [string, string, string][] = [
  ['customer@veyro.test', 'Customer', 'Riya Sen'],
  ['driver@veyro.test', 'Driver', 'Arjun Das'],
  ['driver2@veyro.test', 'Driver', 'Sourav Ghosh'],
  ['applicant@veyro.test', 'Driver applicant', 'Priya Mondal'],
  ['admin@veyro.test', 'Administrator', 'Veyro Admin'],
];

interface StartResult {
  email: string;
  isNewAccount: boolean;
  devCode?: string;
}

function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function AuthInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { me, loading, signIn } = useSession();
  const [role, setRole] = useState<'CUSTOMER' | 'DRIVER'>(params.get('role') === 'driver' ? 'DRIVER' : 'CUSTOMER');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [start, setStart] = useState<StartResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = safeNext(params.get('next'));

  // A signed-in tab is not redirected away: it can continue, or sign in as
  // another account (this replaces only this tab's session).
  const signedIn = !loading && me ? me : null;

  async function requestCode(addr: string): Promise<StartResult> {
    return api<StartResult>('/auth/email/start', { body: { email: addr } });
  }

  async function verify(addr: string, c: string) {
    const result = await api<{ token: string; user: Me }>('/auth/email/verify', { body: { email: addr, code: c, role } });
    signIn(result.token, result.user);
    router.replace(next ?? homeFor(result.user));
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy('email');
    try {
      const r = await requestCode(email.trim());
      setStart(r);
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy('code');
    try {
      await verify(start?.email ?? email.trim(), code.trim());
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  async function quick(addr: string) {
    setError(null);
    setBusy(addr);
    try {
      const r = await requestCode(addr);
      if (!r.devCode) throw new Error('Test accounts are only available in development builds.');
      await verify(addr, r.devCode);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  const input =
    'w-full min-h-[44px] rounded-lg border border-studio-input-border bg-white px-3 text-sm text-studio-ink placeholder:text-studio-muted focus:border-studio-brand focus:outline-none focus:ring-2 focus:ring-studio-brand/20';
  const primary =
    'flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg bg-studio-brand text-sm font-semibold text-white hover:bg-studio-brand-hover disabled:opacity-50';

  return (
    <div className="min-h-screen bg-studio-bg text-studio-ink">
      <header className="border-b border-studio-border bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <img src="/icons/veyro-light-64.png" alt="" className="h-7 w-7" /> Veyro
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{step === 'email' ? 'Sign in to Veyro' : 'Check your email'}</h1>
          <p className="mt-1 text-sm text-studio-muted">
            {step === 'email' ? 'Enter your email and we will send you a 6-digit sign-in code.' : <>Enter the code we sent to <strong className="text-studio-ink">{start?.email}</strong>.</>}
          </p>

          {signedIn ? (
            <div className="mt-6 rounded-lg border border-studio-border bg-white p-4 text-sm" role="status">
              <p>You are signed in as <strong>{signedIn.email}</strong>.</p>
              <div className="mt-3 flex items-center gap-3">
                <button type="button" onClick={() => router.replace(next ?? homeFor(signedIn))} className="min-h-[36px] rounded-lg bg-studio-ink px-3 text-sm font-medium text-white">
                  Continue
                </button>
                <span className="text-xs text-studio-muted">or sign in with a different account below.</span>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-studio-border bg-white p-6 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
            {step === 'email' ? (
              <form onSubmit={onEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium">Email address</label>
                  <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="name@example.com" />
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium">Account type</legend>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup">
                    {(['CUSTOMER', 'DRIVER'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={role === r}
                        onClick={() => setRole(r)}
                        className={`min-h-[40px] rounded-lg border px-3 text-sm font-medium ${role === r ? 'border-studio-brand bg-studio-brand-soft text-studio-brand' : 'border-studio-input-border text-studio-ink hover:bg-studio-tint'}`}
                      >
                        {r === 'CUSTOMER' ? 'Customer' : 'Driver'}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-studio-muted">Only used when creating a new account.</p>
                </fieldset>
                <button type="submit" disabled={busy !== null} className={primary}>
                  {busy === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continue with email
                </button>
              </form>
            ) : (
              <form onSubmit={onCode} className="space-y-4">
                {start?.isNewAccount ? <p className="text-sm text-studio-muted">We will create a new {role === 'DRIVER' ? 'driver' : 'customer'} account for this email.</p> : null}
                {start?.devCode ? (
                  <p className="rounded-lg bg-studio-tint p-3 text-sm">
                    Development build: your code is{' '}
                    <button type="button" className="font-mono font-semibold underline" onClick={() => setCode(start.devCode!)}>{start.devCode}</button>
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  <label htmlFor="code" className="block text-sm font-medium">Sign-in code</label>
                  <input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className={`${input} font-mono text-lg tracking-[0.3em]`}
                  />
                </div>
                <button type="submit" disabled={busy !== null || code.length !== 6} className={primary}>
                  {busy === 'code' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign in
                </button>
                <button type="button" onClick={() => { setStep('email'); setCode(''); }} className="w-full text-sm text-studio-muted hover:text-studio-ink">
                  Use a different email
                </button>
              </form>
            )}
            {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
          </div>

          <p className="mt-4 text-center text-xs text-studio-muted">By continuing you agree to the Veyro terms of service and privacy policy.</p>

          {SHOW_TEST_ACCOUNTS ? (
            <section className="mt-10" aria-labelledby="test-accounts">
              <h2 id="test-accounts" className="text-sm font-medium">Test accounts</h2>
              <p className="mt-0.5 text-xs text-studio-muted">Available in development builds only. Each browser tab keeps its own session.</p>
              <ul className="mt-3 divide-y divide-studio-border overflow-hidden rounded-xl border border-studio-border bg-white">
                {DEMO_ACCOUNTS.map(([addr, label, desc]) => (
                  <li key={addr}>
                    <button type="button" disabled={busy !== null} onClick={() => void quick(addr)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-studio-tint disabled:opacity-60">
                      <span>
                        <span className="block text-sm font-medium">{desc}</span>
                        <span className="block text-xs text-studio-muted">{label} · {addr}</span>
                      </span>
                      {busy === addr ? <Loader2 className="h-4 w-4 animate-spin text-studio-muted" /> : <span className="text-xs font-medium text-studio-brand">Sign in</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-studio-bg" />}>
      <AuthInner />
    </Suspense>
  );
}
