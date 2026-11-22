'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CarFront,
  CheckCircle2,
  FileCheck2,
  Globe2,
  IndianRupee,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';
import {
  Field,
  FileDropzone,
  FormAlert,
  Input,
  Stepper,
  Textarea,
  VeyroButton,
} from '@veyro/ui';
import { saveDriverApplication } from '@/lib/api/client';
import type { DriverDocumentMeta } from '@/lib/api/types';
import { isDemoDataMode } from '@/lib/env';
import { uploadDriverDocument, type DriverDocumentKind } from '@/lib/firebase/storage';
import { publicPolicy } from '@/lib/public-policy';
import { useSession } from '@/lib/auth/session-provider';
import {
  validateDocumentFile,
  validateE164Phone,
  validateRequired,
} from '@/lib/validation';
import { StudioOnboardingShell } from './studio-onboarding-shell';

const steps = ['Personal', 'Capabilities', 'Rates', 'Documents'] as const;
const languages = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Kannada'] as const;
const categories = ['Hatchback', 'Sedan', 'SUV', 'MPV', 'Luxury'] as const;
const transmissions = ['Automatic', 'Manual'] as const;
const documentKinds: DriverDocumentKind[] = ['LICENCE', 'GOVERNMENT_ID', 'PROFILE_PHOTO'];

const documentLabels: Record<DriverDocumentKind, { label: string; hint: string }> = {
  LICENCE: {
    label: 'Driving licence',
    hint: 'JPG, PNG or PDF up to 5 MB. Private to Veyro review.',
  },
  GOVERNMENT_ID: {
    label: 'Government ID',
    hint: 'JPG, PNG or PDF up to 5 MB. Private to Veyro review.',
  },
  PROFILE_PHOTO: {
    label: 'Profile photo',
    hint: 'A clear face photo. JPG or PNG up to 5 MB.',
  },
};

type Errors = Record<string, string>;

interface DocumentState {
  file: File | null;
  progress: number;
  uploading: boolean;
  error?: string;
  meta?: DriverDocumentMeta;
}

const emptyDocument: DocumentState = {
  file: null,
  progress: 0,
  uploading: false,
};

export default function DriverOnboarding() {
  const { user, profile, loading, refreshProfile } = useSession();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [experienceYears, setExperienceYears] = React.useState('');
  const [spokenLanguages, setSpokenLanguages] = React.useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = React.useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = React.useState('');
  const [hourlyRate, setHourlyRate] = React.useState('');
  const [perKmRate, setPerKmRate] = React.useState('');
  const [documents, setDocuments] = React.useState<Record<DriverDocumentKind, DocumentState>>({
    LICENCE: emptyDocument,
    GOVERNMENT_ID: emptyDocument,
    PROFILE_PHOTO: emptyDocument,
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (!profile || hydrated.current) {
      return;
    }
    hydrated.current = true;
    setFullName(profile.fullName === 'New Driver' ? '' : profile.fullName);
    setPhone(profile.phone ?? '');
  }, [profile]);

  function toggleValue(
    values: string[],
    setter: (next: string[]) => void,
    value: string
  ) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function validateStep(): boolean {
    const next: Errors = {};

    if (step === 0) {
      const nameError = validateRequired(fullName, 'your full name');
      const phoneError = validateE164Phone(phone);
      const experience = Number(experienceYears);
      if (nameError) next.fullName = nameError;
      if (phoneError) next.phone = phoneError;
      if (!experienceYears.trim() || !Number.isFinite(experience) || experience < 0 || experience > 50) {
        next.experienceYears = 'Enter experience between 0 and 50 years.';
      }
      if (spokenLanguages.length === 0) next.languages = 'Choose at least one language.';
    }

    if (step === 1) {
      if (selectedCategories.length === 0) next.categories = 'Choose at least one category.';
      if (selectedTransmissions.length === 0) next.transmissions = 'Choose at least one transmission.';
      const areasError = validateRequired(serviceAreas, 'your service areas');
      if (areasError) next.serviceAreas = areasError;
    }

    if (step === 2) {
      const rate = Number(hourlyRate);
      if (!hourlyRate.trim() || !Number.isFinite(rate) || rate <= 0) {
        next.hourlyRate = 'Enter a valid hourly rate.';
      }
      if (perKmRate.trim() && (!Number.isFinite(Number(perKmRate)) || Number(perKmRate) < 0)) {
        next.perKmRate = 'Enter a valid rate or leave this blank.';
      }
    }

    if (step === 3) {
      documentKinds.forEach((kind) => {
        if (!documents[kind].meta) {
          next[kind] = `${documentLabels[kind].label} is required.`;
        }
      });
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleDocument(kind: DriverDocumentKind, file: File | null) {
    if (!file) {
      setDocuments((current) => ({ ...current, [kind]: emptyDocument }));
      return;
    }

    const validationError = validateDocumentFile(file);
    if (validationError) {
      setDocuments((current) => ({
        ...current,
        [kind]: { file, progress: 0, uploading: false, error: validationError },
      }));
      return;
    }

    const metaBase = {
      kind,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    setDocuments((current) => ({
      ...current,
      [kind]: { file, progress: 5, uploading: true },
    }));

    if (isDemoDataMode) {
      for (const progress of [20, 40, 60, 80, 100]) {
        await new Promise((resolve) => setTimeout(resolve, 160));
        setDocuments((current) => ({
          ...current,
          [kind]: { ...current[kind], progress, uploading: progress < 100 },
        }));
      }
      setDocuments((current) => ({
        ...current,
        [kind]: {
          ...current[kind],
          uploading: false,
          meta: { ...metaBase, storagePath: `demo/${kind.toLowerCase()}/${file.name}` },
        },
      }));
      return;
    }

    try {
      const task = uploadDriverDocument(user!.uid, kind, file);
      task.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setDocuments((current) => ({
            ...current,
            [kind]: { ...current[kind], progress, uploading: true },
          }));
        },
        (uploadError) => {
          setDocuments((current) => ({
            ...current,
            [kind]: {
              ...current[kind],
              uploading: false,
              error: uploadError.message || 'Upload failed. Try again.',
            },
          }));
        },
        () => {
          setDocuments((current) => ({
            ...current,
            [kind]: {
              ...current[kind],
              uploading: false,
              progress: 100,
              meta: { ...metaBase, storagePath: task.snapshot.ref.fullPath },
            },
          }));
        }
      );
    } catch (caught) {
      setDocuments((current) => ({
        ...current,
        [kind]: {
          ...current[kind],
          uploading: false,
          error: caught instanceof Error ? caught.message : 'Upload could not start.',
        },
      }));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }
    if (!validateStep()) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await saveDriverApplication(user, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        experienceYears,
        languages: spokenLanguages,
        categories: selectedCategories,
        transmissions: selectedTransmissions,
        serviceAreas: serviceAreas.trim(),
        hourlyRate,
        perKmRate,
        documents: documentKinds
          .map((kind) => documents[kind].meta)
          .filter((meta): meta is DriverDocumentMeta => Boolean(meta)),
      });
      await refreshProfile();
      setSubmitted(true);
    } catch (caught) {
      setSubmitError(
        caught instanceof Error ? caught.message : 'Could not submit your application.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const estimate = Number(hourlyRate) > 0 ? Math.round(Number(hourlyRate) * 2.5) : 0;

  return (
    <StudioOnboardingShell
      title="Driver onboarding"
      subtitle="Apply to drive on Veyro"
      stepLabel={submitted ? 'Submitted' : `Step ${step + 1} of ${steps.length}`}
    >
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        {!submitted ? <Stepper steps={steps} current={step} className="mb-6" /> : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10 lg:items-start">
          <aside className="space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                Driver application
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-studio-ink">
                Drive your own car. On your terms.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-studio-muted">
                Four focused steps. Your documents stay private and are reviewed before you can go
                online.
              </p>
            </div>

            <div className="rounded-card border border-studio-border bg-studio-surface p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-studio-tint">
                <LockKeyhole aria-hidden="true" className="h-5 w-5 text-studio-ink" />
              </span>
              <p className="mt-3 font-display text-base font-bold text-studio-ink">
                Private document vault
              </p>
              <p className="mt-2 text-xs leading-relaxed text-studio-muted">
                Uploads are scoped to your account only. Veyro never exposes public document URLs.
              </p>
            </div>

            {isDemoDataMode ? (
              <FormAlert tone="info" title="Demo data">
                Uploads and application state are simulated in this browser. No backend record is
                created.
              </FormAlert>
            ) : null}
          </aside>

          <section className="rounded-card border border-studio-border bg-studio-surface p-5 sm:p-8">
            {loading ? (
              <div className="space-y-4">
                <div className="h-6 w-48 animate-pulse motion-reduce:animate-none rounded bg-studio-tint" />
                <div className="h-12 animate-pulse motion-reduce:animate-none rounded-panel bg-studio-tint" />
                <div className="h-12 animate-pulse motion-reduce:animate-none rounded-panel bg-studio-tint" />
              </div>
            ) : !user ? (
              <div className="space-y-5">
                <FormAlert tone="warning" title="Sign in to apply">
                  A verified Veyro identity is required before starting a driver application.
                </FormAlert>
                <VeyroButton asChild className="w-full">
                  <Link href="/auth?role=driver">Sign in as a driver</Link>
                </VeyroButton>
              </div>
            ) : submitted ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-studio-lime text-studio-ink">
                  <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
                </div>
                <h2 className="mt-6 font-display text-3xl font-extrabold text-studio-ink">
                  Application submitted
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-studio-muted">
                  Your application is <span className="font-semibold text-studio-ink">PENDING_REVIEW</span>.
                  You cannot go online until Veyro approves it.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <VeyroButton asChild size="lg">
                    <Link href="/driver/status">View application status</Link>
                  </VeyroButton>
                  <VeyroButton asChild variant="secondary" size="lg">
                    <Link href="/">Back to home</Link>
                  </VeyroButton>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <AnimatePresence mode="wait">
                  {step === 0 ? (
                    <motion.div
                      key="step-0"
                      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <DriverStepOne
                        fullName={fullName}
                        phone={phone}
                        experienceYears={experienceYears}
                        spokenLanguages={spokenLanguages}
                        errors={errors}
                        setFullName={setFullName}
                        setPhone={setPhone}
                        setExperienceYears={setExperienceYears}
                        onToggleLanguage={(value) =>
                          toggleValue(spokenLanguages, setSpokenLanguages, value)
                        }
                      />
                    </motion.div>
                  ) : null}

                  {step === 1 ? (
                    <motion.div
                      key="step-1"
                      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <DriverStepTwo
                        selectedCategories={selectedCategories}
                        selectedTransmissions={selectedTransmissions}
                        serviceAreas={serviceAreas}
                        errors={errors}
                        onToggleCategory={(value) =>
                          toggleValue(selectedCategories, setSelectedCategories, value)
                        }
                        onToggleTransmission={(value) =>
                          toggleValue(selectedTransmissions, setSelectedTransmissions, value)
                        }
                        setServiceAreas={setServiceAreas}
                      />
                    </motion.div>
                  ) : null}

                  {step === 2 ? (
                    <motion.div
                      key="step-2"
                      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <DriverStepThree
                        hourlyRate={hourlyRate}
                        perKmRate={perKmRate}
                        estimate={estimate}
                        errors={errors}
                        setHourlyRate={setHourlyRate}
                        setPerKmRate={setPerKmRate}
                      />
                    </motion.div>
                  ) : null}

                  {step === 3 ? (
                    <motion.div
                      key="step-3"
                      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <DriverStepFour
                        documents={documents}
                        errors={errors}
                        onDocumentChange={handleDocument}
                        summary={{
                          name: fullName,
                          phone,
                          categories: selectedCategories,
                          transmissions: selectedTransmissions,
                          serviceAreas,
                          hourlyRate,
                        }}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {submitError ? (
                  <FormAlert tone="error" title="Could not submit application" className="mt-6">
                    {submitError}
                  </FormAlert>
                ) : null}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                  {step > 0 ? (
                    <VeyroButton
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => {
                        setErrors({});
                        setStep((current) => current - 1);
                      }}
                    >
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                      Back
                    </VeyroButton>
                  ) : null}
                  {step < 3 ? (
                    <VeyroButton
                      type="button"
                      size="lg"
                      className="flex-1"
                      onClick={() => {
                        if (validateStep()) setStep((current) => current + 1);
                      }}
                    >
                      Continue
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </VeyroButton>
                  ) : (
                    <VeyroButton type="submit" size="lg" className="flex-1" loading={submitting}>
                      Submit application
                    </VeyroButton>
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </StudioOnboardingShell>
  );
}

function DriverStepOne({
  fullName,
  phone,
  experienceYears,
  spokenLanguages,
  errors,
  setFullName,
  setPhone,
  setExperienceYears,
  onToggleLanguage,
}: {
  fullName: string;
  phone: string;
  experienceYears: string;
  spokenLanguages: string[];
  errors: Errors;
  setFullName: (value: string) => void;
  setPhone: (value: string) => void;
  setExperienceYears: (value: string) => void;
  onToggleLanguage: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeading
        icon={<BadgeCheck className="h-5 w-5" />}
        title="Your personal profile"
        description="This is the identity customers see after approval."
      />
      <Field id="driver-name" label="Full name" required error={errors.fullName}>
        <Input
          id="driver-name"
          autoComplete="name"
          placeholder="Riya Menon"
          value={fullName}
          invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'driver-name-error' : undefined}
          onChange={(event) => setFullName(event.currentTarget.value)}
        />
      </Field>
      <Field
        id="driver-phone"
        label="Contact phone"
        required
        error={errors.phone}
        hint="International format, for example +919876543210."
      >
        <Input
          id="driver-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+919876543210"
          value={phone}
          invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'driver-phone-error' : 'driver-phone-hint'}
          onChange={(event) => setPhone(event.currentTarget.value)}
        />
      </Field>
      <Field
        id="driver-experience"
        label="Years of driving experience"
        required
        error={errors.experienceYears}
      >
        <Input
          id="driver-experience"
          type="number"
          min={0}
          max={50}
          placeholder="5"
          value={experienceYears}
          invalid={Boolean(errors.experienceYears)}
          aria-describedby={errors.experienceYears ? 'driver-experience-error' : undefined}
          onChange={(event) => setExperienceYears(event.currentTarget.value)}
        />
      </Field>
      <fieldset>
        <legend className="flex items-center gap-2 text-sm font-medium text-studio-ink">
          <Globe2 aria-hidden="true" className="h-4 w-4" />
          Languages you speak
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {languages.map((language) => (
            <Chip
              key={language}
              label={language}
              active={spokenLanguages.includes(language)}
              onClick={() => onToggleLanguage(language)}
            />
          ))}
        </div>
        {errors.languages ? (
          <p id="driver-languages-error" role="alert" className="mt-2 text-xs font-medium text-[color:var(--theme-error)]">
            {errors.languages}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}

function DriverStepTwo({
  selectedCategories,
  selectedTransmissions,
  serviceAreas,
  errors,
  onToggleCategory,
  onToggleTransmission,
  setServiceAreas,
}: {
  selectedCategories: string[];
  selectedTransmissions: string[];
  serviceAreas: string;
  errors: Errors;
  onToggleCategory: (value: string) => void;
  onToggleTransmission: (value: string) => void;
  setServiceAreas: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeading
        icon={<CarFront className="h-5 w-5" />}
        title="What you can drive"
        description="Matching uses category and transmission only."
      />
      <fieldset>
        <legend className="text-sm font-medium text-studio-ink">Vehicle categories</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              active={selectedCategories.includes(category)}
              onClick={() => onToggleCategory(category)}
            />
          ))}
        </div>
        {errors.categories ? (
          <p role="alert" className="mt-2 text-xs font-medium text-[color:var(--theme-error)]">
            {errors.categories}
          </p>
        ) : null}
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-studio-ink">Transmissions</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {transmissions.map((transmission) => (
            <Chip
              key={transmission}
              label={transmission}
              active={selectedTransmissions.includes(transmission)}
              onClick={() => onToggleTransmission(transmission)}
            />
          ))}
        </div>
        {errors.transmissions ? (
          <p role="alert" className="mt-2 text-xs font-medium text-[color:var(--theme-error)]">
            {errors.transmissions}
          </p>
        ) : null}
      </fieldset>
      <Field
        id="driver-areas"
        label="Service areas"
        required
        error={errors.serviceAreas}
        hint="List neighbourhoods or zones you know well."
      >
        <Textarea
          id="driver-areas"
          placeholder="Koramangala, Indiranagar, HSR Layout"
          value={serviceAreas}
          invalid={Boolean(errors.serviceAreas)}
          aria-describedby={errors.serviceAreas ? 'driver-areas-error' : 'driver-areas-hint'}
          onChange={(event) => setServiceAreas(event.currentTarget.value)}
        />
      </Field>
    </div>
  );
}

function DriverStepThree({
  hourlyRate,
  perKmRate,
  estimate,
  errors,
  setHourlyRate,
  setPerKmRate,
}: {
  hourlyRate: string;
  perKmRate: string;
  estimate: number;
  errors: Errors;
  setHourlyRate: (value: string) => void;
  setPerKmRate: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeading
        icon={<IndianRupee className="h-5 w-5" />}
        title="Set your rates"
        description="HOURLY is the only active pricing mode in Release 1."
      />
      <Field
        id="driver-hourly"
        label="Hourly rate (₹)"
        required
        error={errors.hourlyRate}
        hint="This is what the fare estimate uses."
      >
        <Input
          id="driver-hourly"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="450"
          value={hourlyRate}
          invalid={Boolean(errors.hourlyRate)}
          aria-describedby={errors.hourlyRate ? 'driver-hourly-error' : 'driver-hourly-hint'}
          onChange={(event) => setHourlyRate(event.currentTarget.value)}
        />
      </Field>
      <Field
        id="driver-per-km"
        label="Per-kilometre rate (stored only)"
        error={errors.perKmRate}
        hint="PER_KM is disabled until GPS distance tracking is approved."
      >
        <div className="relative">
          <Input
            id="driver-per-km"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Not active"
            value={perKmRate}
            disabled
            invalid={Boolean(errors.perKmRate)}
            className="pr-24"
            onChange={(event) => setPerKmRate(event.currentTarget.value)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-control bg-studio-tint px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-studio-muted">
            Disabled
          </span>
        </div>
      </Field>
      <div className="rounded-card border border-studio-border bg-studio-tint p-5">
        <div className="flex items-start gap-3">
          <Sparkles aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-studio-ink" />
          <div>
            <p className="font-display text-base font-bold text-studio-ink">Sample estimate</p>
            <p className="mt-1 text-xs leading-relaxed text-studio-muted">
              Demo estimate for a 2.5-hour trip — not a booking quote.
            </p>
          </div>
        </div>
        <p className="mt-4 font-display text-4xl font-extrabold text-studio-ink">
          ₹{estimate || '—'}
        </p>
        <p className="mt-2 text-xs text-studio-muted">
          Excludes {publicPolicy.excludedExpenses.join(', ').toLowerCase()}.
        </p>
      </div>
    </div>
  );
}

function DriverStepFour({
  documents,
  errors,
  onDocumentChange,
  summary,
}: {
  documents: Record<DriverDocumentKind, DocumentState>;
  errors: Errors;
  onDocumentChange: (kind: DriverDocumentKind, file: File | null) => void;
  summary: {
    name: string;
    phone: string;
    categories: string[];
    transmissions: string[];
    serviceAreas: string;
    hourlyRate: string;
  };
}) {
  return (
    <div className="space-y-5">
      <StepHeading
        icon={<FileCheck2 className="h-5 w-5" />}
        title="Private documents"
        description="Review the summary, then submit for manual approval."
      />
      <div className="space-y-4">
        {documentKinds.map((kind) => (
          <FileDropzone
            key={kind}
            id={`driver-doc-${kind}`}
            label={documentLabels[kind].label}
            hint={documentLabels[kind].hint}
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            value={documents[kind].file}
            progress={documents[kind].uploading ? documents[kind].progress : undefined}
            error={documents[kind].error ?? errors[kind]}
            onChange={(file) => onDocumentChange(kind, file)}
          />
        ))}
      </div>
      <div className="rounded-card border border-studio-border bg-studio-tint p-5 text-xs leading-relaxed text-studio-muted">
        <p className="font-display text-sm font-bold text-studio-ink">Review before submitting</p>
        <p className="mt-2">{summary.name || '—'} · {summary.phone || '—'}</p>
        <p className="mt-1">
          Categories: {summary.categories.join(', ') || '—'} · Transmissions:{' '}
          {summary.transmissions.join(', ') || '—'}
        </p>
        <p className="mt-1">Areas: {summary.serviceAreas || '—'}</p>
        <p className="mt-1">Hourly rate: ₹{summary.hourlyRate || '—'}</p>
      </div>
      <FormAlert tone="info" title="What happens next">
        Your application becomes PENDING_REVIEW. You cannot go online until an Admin approves it.
      </FormAlert>
    </div>
  );
}

function StepHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-studio-tint text-studio-ink">
        {icon}
      </span>
      <div>
        <h2 className="font-display text-2xl font-extrabold text-studio-ink">{title}</h2>
        <p className="mt-1 text-sm text-studio-muted">{description}</p>
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-control border px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'border-studio-ink bg-studio-ink text-white'
          : 'border-studio-border bg-studio-surface text-studio-muted hover:text-studio-ink'
      }`}
    >
      {label}
    </button>
  );
}
