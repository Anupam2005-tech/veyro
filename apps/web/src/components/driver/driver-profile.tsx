'use client';

import * as React from 'react';
import Link from 'next/link';
import { BadgeCheck, FileLock2, Gauge, ShieldAlert, UserRound } from 'lucide-react';
import {
  DemoBadge,
  ErrorState,
  Field,
  FormAlert,
  Input,
  LoadingState,
  VeyroButton,
} from '@veyro/ui';
import { getDriverProfile, saveDriverProfile } from '@/lib/api/client';
import type { DriverProfileDetails, DriverProfileUpdate } from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { DEMO_USER } from '@/lib/demo-user';
import { isDemoDataMode } from '@/lib/env';
import { DriverShell } from './driver-shell';

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function DriverProfile() {
  const { user } = useSession();
  const activeUser = user ?? (isDemoDataMode ? DEMO_USER : null);
  const [profile, setProfile] = React.useState<DriverProfileDetails | null>(null);
  const [form, setForm] = React.useState<DriverProfileUpdate>({
    fullName: '',
    phone: '',
    experienceYears: '',
    languages: [],
    categories: [],
    serviceAreas: '',
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeUser) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getDriverProfile(activeUser)
      .then((next) => {
        if (!active) return;
        setProfile(next);
        setForm({
          fullName: next.fullName,
          phone: next.phone,
          experienceYears: next.experienceYears,
          languages: next.languages,
          categories: next.categories,
          serviceAreas: next.serviceAreas,
        });
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeUser]);

  function setField<K extends keyof DriverProfileUpdate>(key: K, value: DriverProfileUpdate[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!activeUser) return;
    if (!form.fullName.trim() || !form.phone.trim()) {
      setNotice('Name and phone are required.');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const updated = await saveDriverProfile(activeUser, {
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      });
      setProfile(updated);
      setNotice('Driver profile saved.');
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DriverShell subtitle="Profile and verification">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-muted">
              Driver account
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Profile & verification
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-studio-muted">
              Keep your details current. Verification documents are private and never exposed through
              a public URL.
            </p>
          </div>
          {profile?.applicationStatus ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-studio-border bg-studio-surface px-4 py-2 text-xs font-semibold text-studio-ink">
              <BadgeCheck aria-hidden="true" className="h-4 w-4" />
              {profile.applicationStatus.replace('_', ' ')}
            </span>
          ) : null}
        </div>

        {loading ? (
          <LoadingState label="Loading driver profile…" className="mt-8" />
        ) : error || !profile ? (
          <ErrorState title="Profile unavailable" description={error ?? 'No profile found.'} className="mt-8" />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <form
              onSubmit={(event) => void handleSave(event)}
              className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-extrabold text-studio-ink">Personal details</h2>
                <UserRound aria-hidden="true" className="h-5 w-5 text-studio-muted" />
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field id="driver-name" label="Full name" required>
                  <Input
                    id="driver-name"
                    value={form.fullName}
                    onChange={(event) => setField('fullName', event.currentTarget.value)}
                  />
                </Field>
                <Field id="driver-phone" label="Phone" required>
                  <Input
                    id="driver-phone"
                    value={form.phone}
                    onChange={(event) => setField('phone', event.currentTarget.value)}
                  />
                </Field>
                <Field id="driver-experience" label="Experience (years)">
                  <Input
                    id="driver-experience"
                    inputMode="numeric"
                    value={form.experienceYears}
                    onChange={(event) => setField('experienceYears', event.currentTarget.value)}
                  />
                </Field>
                <Field id="driver-languages" label="Languages" hint="Comma separated">
                  <Input
                    id="driver-languages"
                    value={form.languages.join(', ')}
                    onChange={(event) => setField('languages', splitList(event.currentTarget.value))}
                  />
                </Field>
                <Field id="driver-categories" label="Vehicle categories" hint="Comma separated">
                  <Input
                    id="driver-categories"
                    value={form.categories.join(', ')}
                    onChange={(event) => setField('categories', splitList(event.currentTarget.value))}
                  />
                </Field>
                <Field id="driver-areas" label="Service areas" className="sm:col-span-2">
                  <Input
                    id="driver-areas"
                    value={form.serviceAreas}
                    onChange={(event) => setField('serviceAreas', event.currentTarget.value)}
                  />
                </Field>
              </div>
              {notice ? (
                <FormAlert
                  tone={notice.includes('Could not') || notice.includes('required') ? 'error' : 'success'}
                  title="Profile update"
                  className="mt-6"
                >
                  {notice}
                </FormAlert>
              ) : null}
              <div className="mt-7 flex flex-wrap gap-3">
                <VeyroButton type="submit" size="lg" loading={saving}>
                  Save profile
                </VeyroButton>
                <VeyroButton asChild variant="secondary" size="lg">
                  <Link href="/driver/status">View application status</Link>
                </VeyroButton>
              </div>
            </form>

            <div className="space-y-5">
              <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Rate</h2>
                  <Gauge aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                <p className="mt-4 font-display text-4xl font-extrabold text-studio-ink">
                  ₹{profile.hourlyRateInr.toLocaleString('en-IN')}
                  <span className="ml-2 font-body text-sm font-normal text-studio-muted">/ hour</span>
                </p>
                <p className="mt-3 text-xs text-studio-muted">
                  Rate changes affect future bookings only. Contact Veyro support to request a
                  change; no silent rate edits are applied to frozen quotes.
                </p>
              </section>

              <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Private documents</h2>
                  <FileLock2 aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                {profile.documents?.length ? (
                  <ul className="mt-5 space-y-2">
                    {profile.documents.map((document) => (
                      <li
                        key={`${document.kind}-${document.storagePath}`}
                        className="rounded-panel border border-studio-border px-4 py-3 text-xs"
                      >
                        <p className="font-semibold text-studio-ink">
                          {document.kind.replace('_', ' ').toLowerCase()}
                        </p>
                        <p className="mt-1 truncate text-studio-muted">{document.fileName}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-studio-muted">
                    No documents in this demo profile.
                  </p>
                )}
              </section>

              <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Safety record</h2>
                  <ShieldAlert aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                </div>
                <p className="mt-4 text-sm text-studio-ink">
                  Verified no-show incidents: <strong>{profile.noShowIncidents}</strong>
                </p>
                <p className="mt-2 text-xs text-studio-muted">
                  The fifth verified incident triggers automatic suspension. Ordinary driver
                  cancellations are not counted as no-shows.
                </p>
                {profile.suspensionReason ? (
                  <FormAlert tone="warning" title="Suspension reason" className="mt-4">
                    {profile.suspensionReason}
                  </FormAlert>
                ) : null}
              </section>

              {profile.role === 'DRIVER' && isDemoDataMode ? <DemoBadge /> : null}
            </div>
          </div>
        )}
      </div>
    </DriverShell>
  );
}
