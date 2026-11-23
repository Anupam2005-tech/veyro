'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, FileUp } from 'lucide-react';
import { MapView } from '@/components/MapView';
import { PlaceInput } from '@/components/PlaceInput';
import { Alert, Button, Card, ChipToggle, ErrorText, Field, Input, PageHeader, Spinner, StatusBadge, Textarea, cx } from '@/components/ui';
import { CATEGORIES, TRANSMISSIONS } from '@/components/VehicleForm';
import { api, errorMessage } from '@/lib/api';
import { inr } from '@/lib/format';
import { useAction } from '@/lib/hooks';
import { useRequireRole, useSession } from '@/lib/session';
import type { Place } from '@/lib/types';

const LANGS = ['Bengali', 'Hindi', 'English', 'Urdu', 'Odia', 'Nepali'];
const DOCS = [
  ['LICENCE', 'Driving licence'],
  ['GOVERNMENT_ID', 'Government ID'],
  ['PHOTO', 'Profile photo'],
] as const;
const STEPS = ['Profile', 'Driving details', 'Rates', 'Documents'];

interface AppDoc { id: string; kind: string; filename: string; size: number; uploadedAt: string }
interface Application {
  status: string;
  profile: { name: string; phone: string; experienceYears: number; languages: string[]; bio: string };
  capabilities: { categories: string[]; transmissions: string[] };
  serviceArea: Place & { radiusKm: number };
  rates: { hourlyRateInr: number; perKmRateInr: number | null };
  documents: AppDoc[];
  reviewReason: string | null;
  requestedChanges: string[];
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
}

export default function DriverOnboarding() {
  const me = useRequireRole('DRIVER');
  const { refresh } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [review, setReview] = useState<{ status: string; reason: string | null; changes: string[] } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [years, setYears] = useState('2');
  const [languages, setLanguages] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [transmissions, setTransmissions] = useState<string[]>([]);
  const [area, setArea] = useState<Place | null>(null);
  const [radius, setRadius] = useState('15');
  const [hourly, setHourly] = useState('200');
  const [perKm, setPerKm] = useState('');
  const [docs, setDocs] = useState<AppDoc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const { busy, error, run, setError } = useAction();

  useEffect(() => {
    if (!me) return;
    void api<{ application: Application | null }>('/drivers/application').then(({ application: a }) => {
      if (a) {
        if (a.status === 'PENDING_REVIEW' || a.status === 'APPROVED' || a.status === 'DEACTIVATED') {
          router.replace('/driver/status');
          return;
        }
        setReview(a.status === 'DRAFT' ? null : { status: a.status, reason: a.reviewReason, changes: a.requestedChanges });
        if (a.profile.name) setName(a.profile.name);
        if (a.profile.phone) setPhone(a.profile.phone);
        if (a.profile.experienceYears) setYears(String(a.profile.experienceYears));
        setLanguages(a.profile.languages);
        setBio(a.profile.bio);
        setCategories(a.capabilities.categories);
        setTransmissions(a.capabilities.transmissions);
        if (a.serviceArea.label) {
          setArea(a.serviceArea);
          setRadius(String(a.serviceArea.radiusKm));
        }
        if (a.rates.hourlyRateInr) setHourly(String(a.rates.hourlyRateInr));
        if (a.rates.perKmRateInr) setPerKm(String(a.rates.perKmRateInr));
        setDocs(a.documents);
      } else if (me.name) setName(me.name);
      setLoaded(true);
    });
  }, [me, router]);

  if (!me || !loaded) return <Spinner />;

  const toggle = (list: string[], set: (l: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function validateStep(i: number): string | null {
    if (i === 0) {
      if (name.trim().length < 2) return 'Enter your full name.';
      if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) return 'Enter your phone number with the country code, for example +919812345678.';
      if (!languages.length) return 'Choose at least one language.';
    }
    if (i === 1) {
      if (!categories.length || !transmissions.length) return 'Choose the vehicle categories and transmissions you can drive.';
      if (!area) return 'Choose your service area.';
    }
    if (i === 2 && !(Number(hourly) >= 0) ) return 'Enter a valid hourly rate.';
    return null;
  }

  async function upload(kind: string, file: File | undefined) {
    setDocError(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setDocError('Upload a JPG, PNG or PDF file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDocError('Files must be 5 MB or smaller.');
      return;
    }
    setUploading(kind);
    try {
      const dataBase64 = await readBase64(file);
      const doc = await api<AppDoc>('/drivers/documents', { body: { kind, filename: file.name, mime: file.type, dataBase64 } });
      setDocs((d) => [...d.filter((x) => x.kind !== kind), doc]);
    } catch (e) {
      setDocError(errorMessage(e));
    } finally {
      setUploading(null);
    }
  }

  async function submit() {
    for (let i = 0; i < 3; i++) {
      const problem = validateStep(i);
      if (problem) {
        setStep(i);
        setError(problem);
        return;
      }
    }
    const ok = await run(() =>
      api('/drivers/application', {
        body: {
          name, phone: phone.trim(), experienceYears: Number(years), languages, bio, categories, transmissions,
          serviceArea: { ...area!, radiusKm: Number(radius) }, hourlyRateInr: Number(hourly), perKmRateInr: perKm ? Number(perKm) : null,
        },
      }),
    );
    if (ok) {
      await refresh();
      router.push('/driver/status');
    }
  }

  const sample = Math.round((Number(hourly) || 0) * 0.75);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Driver application" subtitle="Tell us about yourself and upload your documents. Our team reviews every application before you can accept trips." />
      {review ? (
        <Alert tone={review.status === 'REJECTED' ? 'danger' : 'warning'} title={review.status === 'REJECTED' ? 'Application not approved' : 'Changes requested'}>
          <p>{review.reason}</p>
          {review.changes.length ? <ul className="mt-1 list-disc pl-5">{review.changes.map((c) => <li key={c}>{c}</li>)}</ul> : null}
          <p className="mt-1">Update the details below and resubmit.</p>
        </Alert>
      ) : null}

      <ol className="grid grid-cols-4 gap-2" aria-label="Application steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={step === i ? 'step' : undefined}
              className={cx('w-full rounded-xl border px-2 py-2 text-left text-xs font-semibold sm:text-sm', step === i ? 'border-studio-obsidian bg-studio-obsidian text-white' : 'border-studio-border bg-white')}
            >
              <span className="tabular-nums">{i + 1}</span> · {s}
            </button>
          </li>
        ))}
      </ol>

      <Card>
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}</Field>
            <Field label="Contact phone" hint="Include the country code">{(id) => <Input id={id} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />}</Field>
            <Field label="Years of professional driving">{(id) => <Input id={id} type="number" min={0} max={60} value={years} onChange={(e) => setYears(e.target.value)} />}</Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-semibold">Languages you speak</p>
              <div className="flex flex-wrap gap-2">{LANGS.map((l) => <ChipToggle key={l} selected={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)}>{l}</ChipToggle>)}</div>
            </div>
            <div className="sm:col-span-2">
              <Field label="Short bio (optional)">{(id) => <Textarea id={id} maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} />}</Field>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold">Vehicle categories you can drive</p>
              <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <ChipToggle key={c} selected={categories.includes(c)} onClick={() => toggle(categories, setCategories, c)}>{c}</ChipToggle>)}</div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Transmissions</p>
              <div className="flex flex-wrap gap-2">{TRANSMISSIONS.map((c) => <ChipToggle key={c} selected={transmissions.includes(c)} onClick={() => toggle(transmissions, setTransmissions, c)}>{c}</ChipToggle>)}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr,140px]">
              <PlaceInput label="Service area centre" value={area} onChange={setArea} />
              <Field label="Radius (km)">{(id) => <Input id={id} type="number" min={2} max={60} value={radius} onChange={(e) => setRadius(e.target.value)} />}</Field>
            </div>
            <MapView
              className="h-56"
              markers={area ? [{ id: 'area', lat: area.lat, lng: area.lng, kind: 'area', label: area.label }] : []}
              circle={area ? { lat: area.lat, lng: area.lng, radiusKm: Number(radius) || 0 } : null}
              fitKey={area ? `${area.lat},${area.lng}` : undefined}
              onPick={(lat, lng) => setArea({ label: `Pinned area (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng })}
              ariaLabel="Service area map. Click to set the centre."
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <Alert tone="info">You set your own hourly rate. Veyro does not take a commission.</Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hourly rate (₹)">{(id) => <Input id={id} type="number" min={0} value={hourly} onChange={(e) => setHourly(e.target.value)} />}</Field>
              <Field label="Per-km rate (₹, optional)" hint="Saved for later. Trips are currently billed hourly.">
                {(id) => <Input id={id} type="number" min={0} value={perKm} onChange={(e) => setPerKm(e.target.value)} />}
              </Field>
            </div>
            <div className="rounded-xl bg-studio-tint p-4 text-sm">
              <p className="text-sm font-medium text-studio-muted">Example</p>
              <p className="mt-1">A 45-minute trip at your hourly rate earns about <strong className="text-lg font-semibold">{inr(sample)}</strong>. Customers pay for the minutes driven, with no minimum.</p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <p className="text-sm text-studio-muted">JPG, PNG or PDF, up to 5 MB each. Your documents are stored privately and are only seen by our review team.</p>
            {DOCS.map(([kind, label]) => {
              const doc = docs.find((d) => d.kind === kind);
              return (
                <div key={kind} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-studio-border p-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {doc ? <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden /> : <FileUp className="h-4 w-4 text-studio-muted" aria-hidden />}
                      {label}
                    </p>
                    <p className="text-xs text-studio-muted">{doc ? `${doc.filename} · ${Math.round(doc.size / 1024)} KB` : 'Not uploaded'}</p>
                  </div>
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center rounded-xl border border-studio-input-border px-3 text-sm font-semibold hover:bg-studio-tint focus-within:ring-2 focus-within:ring-studio-ink">
                    {uploading === kind ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/jpeg,image/png,application/pdf" className="sr-only" disabled={uploading !== null} onChange={(e) => void upload(kind, e.target.files?.[0])} />
                  </label>
                </div>
              );
            })}
            <ErrorText>{docError}</ErrorText>
          </div>
        ) : null}
      </Card>

      <ErrorText>{error}</ErrorText>
      <div className="flex justify-between gap-3">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
        {step < 3 ? (
          <Button
            variant="dark"
            onClick={() => {
              const problem = validateStep(step);
              setError(problem);
              if (!problem) setStep((s) => s + 1);
            }}
          >
            Continue
          </Button>
        ) : (
          <Button busy={busy} disabled={docs.length < 3} onClick={() => void submit()}>
            Submit for review
          </Button>
        )}
      </div>
      {review ? <p className="text-center text-xs text-studio-muted">Current status: <StatusBadge status={review.status} /></p> : null}
    </div>
  );
}
