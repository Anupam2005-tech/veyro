'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import driverIllustration from '../../../public/img5.jpeg';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import {
  Field,
  FileDropzone,
  FormAlert,
  Input,
  VeyroButton,
} from '@veyro/ui';
import {
  currentPosition,
  saveDriverApplication,
  uploadApplicationDocument,
} from '@/lib/api/client';
import type { DriverDocumentMeta } from '@/lib/api/types';
import { getMapsProvider, type Coordinate, type PlaceOption, type PlaceSuggestion } from '@/lib/maps';
import { ServiceAreaPicker, serviceAreaNames } from './service-area-picker';
import { isDemoDataMode } from '@/lib/env';
import { type DriverDocumentKind } from '@/lib/firebase/storage';
import { publicPolicy } from '@/lib/public-policy';
import { useSession } from '@/lib/auth/session-provider';
import {
  validateDocumentFile,
  validateE164Phone,
  validateRequired,
} from '@/lib/validation';

const steps = ['Personal', 'Fleet', 'Rates', 'Verify'] as const;
const languages = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Kannada'] as const;
const categories = ['Hatchback', 'Sedan', 'SUV', 'MPV', 'Luxury'] as const;
const transmissions = ['Automatic', 'Manual'] as const;
const documentKinds: DriverDocumentKind[] = ['LICENCE', 'GOVERNMENT_ID', 'PROFILE_PHOTO'];

const documentLabels: Record<DriverDocumentKind, { label: string; hint: string }> = {
  LICENCE: {
    label: 'Driving licence',
    hint: 'JPG, PNG or PDF · Max 10 MB',
  },
  GOVERNMENT_ID: {
    label: 'Government ID',
    hint: 'JPG, PNG or PDF · Max 10 MB',
  },
  PROFILE_PHOTO: {
    label: 'Profile photo',
    hint: 'Clear face photo · JPG or PNG',
  },
};

type Errors = Record<string, string>;

function normalizePhone(value: string): string {
  const trimmed = value.trim().replace(/[\s-]/g, '');
  if (/^[6-9]\d{9}$/.test(trimmed)) {
    return `+91${trimmed}`;
  }
  if (/^0[6-9]\d{9}$/.test(trimmed)) {
    return `+91${trimmed.slice(1)}`;
  }
  return trimmed;
}

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
  const [servicePlaces, setServicePlaces] = React.useState<PlaceSuggestion[]>([]);
  const serviceAreas = serviceAreaNames(servicePlaces);
  const [coveragePlace, setCoveragePlace] = React.useState<PlaceOption | null>(null);
  const coverageCenter = coveragePlace?.position ?? null;
  const coverageRequest = React.useRef(0);
  const [coverageRadius, setCoverageRadius] = React.useState('');
  const [locatingCoverage, setLocatingCoverage] = React.useState(false);
  const [hourlyRate, setHourlyRate] = React.useState('');
  const [perKmRate, setPerKmRate] = React.useState('');
  const [documents, setDocuments] = React.useState<Record<DriverDocumentKind, DocumentState>>({
    LICENCE: emptyDocument,
    GOVERNMENT_ID: emptyDocument,
    PROFILE_PHOTO: emptyDocument,
  });
  const [errors, setErrors] = React.useState<Errors>({});

  async function chooseCoverage(suggestion?: PlaceSuggestion, useGps = false) {
    const request = ++coverageRequest.current;
    setCoveragePlace(null);
    setLocatingCoverage(Boolean(suggestion || useGps));
    setErrors(current => ({ ...current, coverage: '' }));
    if (!suggestion && !useGps) return;
    try {
      const provider = getMapsProvider();
      let selected: PlaceOption;
      if (useGps) {
        const p = await currentPosition();
        const position = { lat: p.coords.latitude, lng: p.coords.longitude };
        selected = { id: 'current-location', label: 'Current location', address: '', position };
      } else if (suggestion?.position) {
        selected = { ...suggestion, position: suggestion.position };
      } else if (suggestion && provider.resolvePlace) {
        selected = await provider.resolvePlace(suggestion);
      } else {
        throw new Error('Location could not be resolved.');
      }
      if (request === coverageRequest.current) setCoveragePlace(selected);
    } catch {
      if (request === coverageRequest.current) setErrors(current => ({ ...current,
        coverage: useGps ? 'Current location is unavailable. Search for an address instead.' : 'Could not locate this address. Try another suggestion.',
      }));
    } finally {
      if (request === coverageRequest.current) setLocatingCoverage(false);
    }
  }
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (hydrated.current) {
      return;
    }
    const initialName =
      profile?.fullName && profile.fullName !== 'New Driver'
        ? profile.fullName
        : user?.displayName ?? '';
    const initialPhone = profile?.phone || user?.phoneNumber || '';
    if (initialName || initialPhone) {
      hydrated.current = true;
      if (initialName) setFullName(initialName);
      if (initialPhone) setPhone(normalizePhone(initialPhone));
    }
  }, [profile, user]);

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
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone !== phone) {
        setPhone(normalizedPhone);
      }
      const phoneError = validateE164Phone(normalizedPhone);
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
      if (!servicePlaces.length) next.serviceAreas = 'Choose at least one service area from the suggestions.';
      if (
        !isDemoDataMode &&
        (!coverageCenter || !Number.isFinite(Number(coverageRadius)) || Number(coverageRadius) <= 0)
      ) {
        next.coverage = 'Choose the centre and radius of your pickup area.';
      }
    }

    if (step === 2) {
      const rate = Number(hourlyRate);
      if (!hourlyRate.trim() || !Number.isFinite(rate) || rate < 0) {
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
      const uploaded = await uploadApplicationDocument(user!, kind, file);
      setDocuments((current) =>
        current[kind].file !== file
          ? current
          : {
              ...current,
              [kind]: {
                ...current[kind],
                uploading: false,
                progress: 100,
                meta: { ...metaBase, ...uploaded, kind },
              },
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
      if (isDemoDataMode) {
        setSubmitted(true);
        return;
      }
      setSubmitError('Please sign in to submit your chauffeur application.');
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
        serviceAreas: isDemoDataMode ? serviceAreas : '',
        ...(isDemoDataMode ? {} : { serviceAreaPlaceIds: servicePlaces.map(place => place.id) }),
        ...(coverageCenter
          ? {
              serviceAreaBounds: {
                southWest: {
                  lat: Math.max(-90, coverageCenter.lat - Number(coverageRadius) / 111.32),
                  lng: Math.max(
                    -180,
                    coverageCenter.lng -
                      Number(coverageRadius) /
                        (111.32 * Math.max(0.01, Math.cos((coverageCenter.lat * Math.PI) / 180)))
                  ),
                },
                northEast: {
                  lat: Math.min(90, coverageCenter.lat + Number(coverageRadius) / 111.32),
                  lng: Math.min(
                    180,
                    coverageCenter.lng +
                      Number(coverageRadius) /
                        (111.32 * Math.max(0.01, Math.cos((coverageCenter.lat * Math.PI) / 180)))
                  ),
                },
              },
            }
          : {}),
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

  const stepMotion = {
    initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
    transition: { duration: 0.18, ease: 'easeOut' as const },
  };

  return (
    <div data-theme="studio" className="driver-form-surface flex min-h-screen flex-col bg-[#F5F6F1] text-[#0E1013] antialiased">
      {/* Header — logo only */}
      <header className="sticky top-0 z-40 bg-[#F5F6F1]/80 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center px-6 sm:px-10 lg:px-12">
          <Link
            href="/"
            aria-label="Veyro home"
            className="inline-flex items-center rounded-md transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E1013]/30"
          >
            <Image
              src="/brand/veyro-light-logo-trimmed.png"
              alt="Veyro"
              width={104}
              height={28}
              priority
              className="h-6 w-auto object-contain sm:h-7"
            />
          </Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)] w-full flex-1 flex-col lg:flex-row">
        {/* ============================ FORM ============================ */}
        <section className="flex w-full flex-col px-6 pb-6 pt-2 sm:px-12 lg:w-[48%] lg:px-14 xl:px-24">
          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-6">
            {/* Mobile banner */}
            <div className="mb-8 flex items-center gap-3.5 rounded-2xl bg-white p-3 shadow-[0_1px_0_rgba(14,16,19,0.04),0_12px_32px_-12px_rgba(14,16,19,0.12)] lg:hidden">
              <div className="relative h-14 w-[72px] shrink-0 overflow-hidden rounded-xl">
                <Image
                  src={driverIllustration}
                  alt=""
                  fill
                  sizes="72px"
                  priority
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-black tracking-tight">
                  Drive the finest. Keep every rupee.
                </p>
                <span className="mt-1 inline-block rounded-full bg-[#B8F23A] px-2 py-0.5 text-[10.5px] font-bold">
                  0% commission
                </span>
              </div>
            </div>

            {/* Progress */}
            {!submitted ? (
              <div className="mb-9" aria-label={`Step ${step + 1} of 4: ${steps[step]}`}>
                <div className="grid grid-cols-4 gap-1.5">
                  {steps.map((s, idx) => (
                    <div key={s} className="h-1 overflow-hidden rounded-full bg-[#0E1013]/[0.08]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          idx < step
                            ? 'w-full bg-[#0E1013]'
                            : idx === step
                            ? 'w-full bg-[#9BD41C]'
                            : 'w-0'
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-medium text-[#6B7080]">
                  <span className="text-[#0E1013]">{steps[step]}</span>
                  <span>
                    {step + 1} of {steps.length}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Preview notice */}
            {!user ? (
              <div className="mb-6 flex items-center justify-between gap-3 rounded-full bg-white px-4 py-2.5 text-xs shadow-[0_1px_0_rgba(14,16,19,0.04)]">
                <span className="text-[#6B7080]">Preview mode</span>
                <Link
                  href="/auth/driver?returnTo=/onboarding/driver"
                  className="shrink-0 font-bold underline decoration-[#0E1013]/25 underline-offset-4 hover:decoration-[#0E1013]"
                >
                  Sign in to save
                </Link>
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-4 py-8">
                <div className="h-9 w-48 animate-pulse rounded-xl bg-[#0E1013]/[0.06]" />
                <div className="h-12 animate-pulse rounded-2xl bg-[#0E1013]/[0.04]" />
                <div className="h-12 animate-pulse rounded-2xl bg-[#0E1013]/[0.04]" />
              </div>
            ) : submitted ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#B8F23A] shadow-[0_16px_40px_-8px_rgba(155,212,28,0.55)]">
                  <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
                </div>
                <h2 className="mt-6 font-display text-4xl font-black tracking-[-0.035em]">
                  You’re in.
                </h2>
                <p className="mt-2 text-sm text-studio-muted">Check your application status for review updates.</p>
                <div className="mt-9 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                  <VeyroButton
                    asChild
                    size="lg"
                    className="h-12 rounded-full bg-[#0E1013] px-7 font-bold text-white hover:bg-black"
                  >
                    <Link href="/driver/status">Check status</Link>
                  </VeyroButton>
                  <VeyroButton
                    asChild
                    variant="secondary"
                    size="lg"
                    className="h-12 rounded-full border-[#0E1013]/10 bg-white px-7"
                  >
                    <Link href="/">Home</Link>
                  </VeyroButton>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-8">
                <AnimatePresence mode="wait">
                  {step === 0 ? (
                    <motion.div key="step-0" {...stepMotion}>
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
                    <motion.div key="step-1" {...stepMotion}>
                      <DriverStepTwo
                        selectedCategories={selectedCategories}
                        selectedTransmissions={selectedTransmissions}
                        serviceAreas={servicePlaces}
                        bias={coverageCenter}
                        errors={errors}
                        onToggleCategory={(value) =>
                          toggleValue(selectedCategories, setSelectedCategories, value)
                        }
                        onToggleTransmission={(value) =>
                          toggleValue(selectedTransmissions, setSelectedTransmissions, value)
                        }
                        setServiceAreas={places => {
                          setServicePlaces(places);
                          setErrors(current => ({ ...current, serviceAreas: '' }));
                        }}
                      />
                      {(
                        <fieldset className="mt-6 space-y-3 rounded-3xl bg-white p-4 shadow-[0_1px_0_rgba(14,16,19,0.04),0_12px_32px_-16px_rgba(14,16,19,0.14)]">
                          <legend className="px-1 text-sm font-bold">Pickup zone</legend>
                          <ServiceAreaPicker pickupZone places={coveragePlace ? [coveragePlace] : []}
                            onChange={places => void chooseCoverage(places[0])} />
                          <div className="flex justify-end">
                            {coverageCenter ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#B8F23A]/40 px-2 py-0.5 text-[11px] font-bold text-[#365314]">
                                <MapPin aria-hidden="true" className="h-3 w-3" />
                                Pinned
                              </span>
                            ) : null}
                          </div>

                          <VeyroButton
                            type="button"
                            variant="secondary"
                            loading={locatingCoverage}
                            className="h-11 w-full rounded-full border-[#0E1013]/10 bg-[#F5F6F1] text-xs font-semibold text-[#0E1013] hover:bg-[#ECEEE6]"
                            onClick={() => void chooseCoverage(undefined, true)}
                          >
                            Use current location
                          </VeyroButton>

                          <Field
                            id="coverage-radius"
                            label="Radius (km)"
                            required
                            error={errors.coverage}
                          >
                            <Input
                              id="coverage-radius"
                              type="number"
                              min="0"
                              placeholder="15"
                              value={coverageRadius}
                              onChange={(e) => setCoverageRadius(e.currentTarget.value)}
                            />
                          </Field>
                        </fieldset>
                      )}
                    </motion.div>
                  ) : null}

                  {step === 2 ? (
                    <motion.div key="step-2" {...stepMotion}>
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
                    <motion.div key="step-3" {...stepMotion}>
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
                  <FormAlert tone="error" title="Could not submit">
                    {submitError}
                  </FormAlert>
                ) : null}

                {/* Navigation */}
                <div className="flex items-center gap-3">
                  {step > 0 ? (
                    <VeyroButton
                      type="button"
                      variant="secondary"
                      size="lg"
                      aria-label="Back"
                      className="h-12 w-12 shrink-0 rounded-full border-[#0E1013]/10 bg-white p-0 text-[#0E1013] hover:bg-[#ECEEE6]"
                      onClick={() => {
                        setErrors({});
                        setStep((current) => current - 1);
                      }}
                    >
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    </VeyroButton>
                  ) : null}

                  {step < 3 ? (
                    <VeyroButton
                      type="button"
                      size="lg"
                      className="group flex h-12 flex-1 items-center justify-between rounded-full bg-[#0E1013] pl-7 pr-1.5 font-bold text-white transition-all hover:bg-black hover:shadow-[0_16px_32px_-12px_rgba(14,16,19,0.45)]"
                      onClick={() => {
                        if (validateStep()) setStep((current) => current + 1);
                      }}
                    >
                      <span>Continue</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B8F23A] text-[#0E1013] transition-transform group-hover:translate-x-0.5">
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </span>
                    </VeyroButton>
                  ) : (
                    <VeyroButton
                      type="submit"
                      size="lg"
                      className="group flex h-12 flex-1 items-center justify-between rounded-full bg-[#0E1013] pl-7 pr-1.5 font-bold text-white transition-all hover:bg-black hover:shadow-[0_16px_32px_-12px_rgba(14,16,19,0.45)]"
                      loading={submitting}
                    >
                      <span>Submit application</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B8F23A] text-[#0E1013] transition-transform group-hover:translate-x-0.5">
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </span>
                    </VeyroButton>
                  )}
                </div>
              </form>
            )}
          </div>

          <footer className="mx-auto flex w-full max-w-[440px] items-center gap-1.5 text-[11px] text-studio-muted">
            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
            Encrypted & private
          </footer>
        </section>

        {/* ============================ STAGE ============================ */}
        <section className="hidden flex-1 p-4 pl-0 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-64px)]">
          <div className="flex h-full w-full flex-col gap-4 overflow-hidden rounded-[36px] bg-[#E9EBE2] p-5 shadow-[0_30px_80px_-30px_rgba(14,16,19,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-[#B8F23A] px-3.5 py-1.5 text-xs font-bold shadow-[0_8px_20px_-6px_rgba(155,212,28,0.6)]">
                0% commission
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-xl">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Dual-OTP custody
              </span>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl bg-[#FCFCFC]">
              <Image src={driverIllustration} alt="Illustration of a chauffeur driving through the city"
                fill sizes="(min-width: 1024px) 50vw, 72px" priority className="object-contain p-3" />
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="rounded-[28px] bg-white p-5 xl:p-6"
            >
              <h2 className="font-display text-3xl font-black leading-[1.04] tracking-[-0.035em] xl:text-[44px]">
                Drive the finest.
                <br />
                Keep every rupee.
              </h2>
              <div className="mt-6 grid grid-cols-3 divide-x divide-[#0E1013]/[0.08] text-center">
                <Stat value="0%" label="Commission" />
                <Stat value="Hourly" label="Rates" />
                <Stat value="Required" label="Review" />
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
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
      <StepHeading title="Who’s driving?" />

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_130px]">
        <Field id="driver-phone" label="Phone" required error={errors.phone}>
          <Input
            id="driver-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+919876543210"
            value={phone}
            invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'driver-phone-error' : undefined}
            onChange={(event) => setPhone(event.currentTarget.value)}
          />
        </Field>

        <Field
          id="driver-experience"
          label="Years driving"
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
      </div>

      <fieldset>
        <legend className="text-xs font-semibold">Languages</legend>
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
          <p
            id="driver-languages-error"
            role="alert"
            className="mt-2 text-xs font-medium text-[#DC2626]"
          >
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
  bias,
  errors,
  onToggleCategory,
  onToggleTransmission,
  setServiceAreas,
}: {
  selectedCategories: string[];
  selectedTransmissions: string[];
  serviceAreas: PlaceSuggestion[];
  bias: Coordinate | null;
  errors: Errors;
  onToggleCategory: (value: string) => void;
  onToggleTransmission: (value: string) => void;
  setServiceAreas: (value: PlaceSuggestion[]) => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeading title="What do you drive?" />

      <fieldset>
        <legend className="text-xs font-semibold">Categories</legend>
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
          <p role="alert" className="mt-2 text-xs font-medium text-[#DC2626]">
            {errors.categories}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold">Transmission</legend>
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
          <p role="alert" className="mt-2 text-xs font-medium text-[#DC2626]">
            {errors.transmissions}
          </p>
        ) : null}
      </fieldset>

      <ServiceAreaPicker places={serviceAreas} onChange={setServiceAreas} bias={bias} error={errors.serviceAreas} />
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
    <div className="space-y-6">
      <StepHeading title="Name your price." />

      <Field id="driver-hourly" label="Hourly rate (₹)" required error={errors.hourlyRate}>
        <Input
          id="driver-hourly"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="450"
          value={hourlyRate}
          invalid={Boolean(errors.hourlyRate)}
          aria-describedby={errors.hourlyRate ? 'driver-hourly-error' : undefined}
          onChange={(event) => setHourlyRate(event.currentTarget.value)}
        />
      </Field>

      <Field id="driver-per-km" label="Per-km rate" error={errors.perKmRate}>
        <div className="relative">
          <Input
            id="driver-per-km"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Coming soon"
            value={perKmRate}
            disabled
            invalid={Boolean(errors.perKmRate)}
            className="pr-24"
            onChange={(event) => setPerKmRate(event.currentTarget.value)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#ECEEE6] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#6B7080]">
            Soon
          </span>
        </div>
      </Field>

      {/* The one bold moment */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#B8F23A] p-6 shadow-[0_24px_48px_-24px_rgba(155,212,28,0.7)]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/40 blur-2xl" />
        <p className="relative text-xs font-semibold text-[#0E1013]/70">2.5 hr trip</p>
        <p className="relative mt-1 font-display text-5xl font-black tracking-[-0.04em]">
          ₹{estimate ? estimate.toLocaleString('en-IN') : '—'}
        </p>
        <p className="relative mt-2 text-[11px] font-medium text-[#0E1013]/65">
          All yours · excludes {publicPolicy.excludedExpenses.join(', ').toLowerCase()}
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
  const initial = summary.name.trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <StepHeading title="Prove it’s you." />

      <div className="space-y-3.5">
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

      <div className="flex items-center gap-3.5 rounded-3xl bg-white p-4 shadow-[0_1px_0_rgba(14,16,19,0.04),0_12px_32px_-16px_rgba(14,16,19,0.14)]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0E1013] font-display text-base font-black text-[#B8F23A]">
          {initial || '—'}
        </div>
        <div className="min-w-0 flex-1 text-xs">
          <p className="truncate text-sm font-bold">
            {summary.name || '—'}
            <span className="font-medium text-[#6B7080]"> · {summary.phone || '—'}</span>
          </p>
          <p className="mt-0.5 truncate text-[#6B7080]">
            {summary.categories.join(', ') || '—'} · {summary.transmissions.join(', ') || '—'}
          </p>
        </div>
        <span className="shrink-0 font-display text-base font-black">
          ₹{summary.hourlyRate || '—'}
          <span className="text-xs font-medium text-[#6B7080]">/hr</span>
        </span>
      </div>
    </div>
  );
}

function StepHeading({ title }: { title: string }) {
  return (
    <h1 className="pb-1 font-display text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-[44px]">
      {title}
    </h1>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl font-black tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-[#6B7080]">{label}</p>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E1013]/30 active:scale-[0.97] ${
        active
          ? 'border-[#0E1013] bg-[#0E1013] text-white shadow-[0_8px_20px_-8px_rgba(14,16,19,0.5)]'
          : 'border-[#0E1013]/10 bg-white text-[#4B5160] hover:border-[#0E1013]/30 hover:text-[#0E1013]'
      }`}
    >
      {active ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-[#B8F23A]" /> : null}
      {label}
    </button>
  );
}
