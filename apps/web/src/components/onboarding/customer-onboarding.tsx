'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CarFront,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  CheckboxField,
  Field,
  FormAlert,
  Input,
  Select,
  Stepper,
  VeyroButton,
} from '@veyro/ui';
import { saveCustomerOnboarding } from '@/lib/api/client';
import type { CustomerVehicleInput } from '@/lib/api/types';
import { isDemoDataMode } from '@/lib/env';
import { useSession } from '@/lib/auth/session-provider';
import { validateE164Phone, validateRequired } from '@/lib/validation';
import { StudioOnboardingShell } from './studio-onboarding-shell';

const steps = ['Your details', 'Vehicle', 'Done'] as const;
const categories = ['Hatchback', 'Sedan', 'SUV', 'MPV', 'Luxury'] as const;
const transmissions = ['Automatic', 'Manual'] as const;
const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'] as const;

type Errors = Record<string, string>;

export default function CustomerOnboarding() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useSession();
  const [step, setStep] = React.useState(0);
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [consentTerms, setConsentTerms] = React.useState(false);
  const [consentPrivacy, setConsentPrivacy] = React.useState(false);
  const [make, setMake] = React.useState('');
  const [model, setModel] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [transmission, setTransmission] = React.useState('');
  const [fuelType, setFuelType] = React.useState('');
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (!profile || hydrated.current) {
      return;
    }
    hydrated.current = true;
    setFullName(profile.fullName === 'Veyro Customer' ? '' : profile.fullName);
    setPhone(profile.phone ?? '');
  }, [profile]);

  function validateDetails(): boolean {
    const next: Errors = {};
    const nameError = validateRequired(fullName, 'your full name');
    const phoneError = validateE164Phone(phone);

    if (nameError) next.fullName = nameError;
    if (phoneError) next.phone = phoneError;
    if (!consentTerms) next.consentTerms = 'Accept the Terms to continue.';
    if (!consentPrivacy) next.consentPrivacy = 'Accept the Privacy Policy to continue.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateVehicle(): { ok: boolean; vehicle: CustomerVehicleInput | null } {
    const hasVehicle = [make, model, category, transmission, fuelType].some((value) =>
      Boolean(value.trim())
    );
    if (!hasVehicle) {
      return { ok: true, vehicle: null };
    }

    const next: Errors = {};
    if (!make.trim()) next.make = 'Enter the make.';
    if (!model.trim()) next.model = 'Enter the model.';
    if (!category) next.category = 'Choose a category.';
    if (!transmission) next.transmission = 'Choose a transmission.';
    if (!fuelType) next.fuelType = 'Choose a fuel type.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      return { ok: false, vehicle: null };
    }

    return {
      ok: true,
      vehicle: { make: make.trim(), model: model.trim(), category, transmission, fuelType },
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.replace('/auth?role=customer');
      return;
    }

    const validation = validateVehicle();
    if (!validation.ok) {
      return;
    }
    const vehicle = validation.vehicle;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await saveCustomerOnboarding(user, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        consentTerms,
        consentPrivacy,
        vehicle,
      });
      await refreshProfile();
      setErrors({});
      setStep(2);
    } catch (caught) {
      setSubmitError(
        caught instanceof Error ? caught.message : 'Could not save your profile. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StudioOnboardingShell
      title="Customer onboarding"
      subtitle="Set up your Veyro rider profile"
      stepLabel={`Step ${Math.min(step + 1, 3)} of 3`}
    >
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Stepper steps={steps} current={step} className="mb-8" />

        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <aside className="space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
                Welcome to Veyro
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-studio-ink">
                Your keys. Your car. Your rules.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-studio-muted">
                Add the basics so a verified professional can find you, understand your vehicle and
                get you moving without the traffic stress.
              </p>
            </div>

            <div className="rounded-card border border-studio-border bg-studio-surface p-5">
              <ShieldCheck aria-hidden="true" className="h-5 w-5 text-studio-ink" />
              <p className="mt-3 font-display text-base font-bold text-studio-ink">
                Verification comes first
              </p>
              <p className="mt-2 text-xs leading-relaxed text-studio-muted">
                Driver documents stay private and are reviewed before anyone goes online. You can
                add your vehicle later if you are not ready now.
              </p>
            </div>

            {isDemoDataMode ? (
              <FormAlert tone="info" title="Demo data">
                Profile details are saved in this browser only. No backend profile is created.
              </FormAlert>
            ) : null}
          </aside>

          <section className="rounded-card border border-studio-border bg-studio-surface p-5 shadow-glass sm:p-8">
            {loading ? (
              <div className="space-y-4">
                <div className="h-6 w-40 animate-pulse motion-reduce:animate-none rounded bg-studio-tint" />
                <div className="h-12 animate-pulse motion-reduce:animate-none rounded-panel bg-studio-tint" />
                <div className="h-12 animate-pulse motion-reduce:animate-none rounded-panel bg-studio-tint" />
              </div>
            ) : !user ? (
              <div className="space-y-5">
                <FormAlert tone="warning" title="Sign in to continue">
                  We need a verified Veyro identity before saving your profile.
                </FormAlert>
                <VeyroButton asChild className="w-full">
                  <Link href="/auth?role=customer">Sign in as a customer</Link>
                </VeyroButton>
              </div>
            ) : step === 2 ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-studio-lime text-studio-ink">
                  <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
                </div>
                <h2 className="mt-6 font-display text-3xl font-extrabold text-studio-ink">
                  You are ready to ride
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-studio-muted">
                  Your Veyro profile is set. Add another vehicle any time from your profile, or head
                  straight to the booking studio.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <VeyroButton asChild size="lg">
                    <Link href="/customer">Open booking studio</Link>
                  </VeyroButton>
                  <VeyroButton asChild variant="secondary" size="lg">
                    <Link href="/">Back to home</Link>
                  </VeyroButton>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {step === 0 ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display text-2xl font-extrabold text-studio-ink">
                        Tell us about you
                      </h2>
                      <p className="mt-2 text-sm text-studio-muted">
                        This stays with your Veyro identity and cannot be trusted from the browser
                        alone.
                      </p>
                    </div>

                    <Field id="customer-name" label="Full name" required error={errors.fullName}>
                      <Input
                        id="customer-name"
                        autoComplete="name"
                        placeholder="Aarav Sharma"
                        value={fullName}
                        invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? 'customer-name-error' : undefined}
                        onChange={(event) => setFullName(event.currentTarget.value)}
                      />
                    </Field>

                    <Field
                      id="customer-phone"
                      label="Contact phone"
                      required
                      error={errors.phone}
                      hint="International format, for example +919876543210."
                    >
                      <Input
                        id="customer-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+919876543210"
                        value={phone}
                        invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? 'customer-phone-error' : 'customer-phone-hint'}
                        onChange={(event) => setPhone(event.currentTarget.value)}
                      />
                    </Field>

                    <div className="space-y-3">
                      <CheckboxField
                        id="customer-terms"
                        checked={consentTerms}
                        error={errors.consentTerms}
                        onChange={setConsentTerms}
                        label={
                          <>
                            I accept the{' '}
                            <Link href="/legal/terms" className="underline underline-offset-2">
                              Terms of Service
                            </Link>
                          </>
                        }
                      />
                      <CheckboxField
                        id="customer-privacy"
                        checked={consentPrivacy}
                        error={errors.consentPrivacy}
                        onChange={setConsentPrivacy}
                        label={
                          <>
                            I have read the{' '}
                            <Link href="/legal/privacy" className="underline underline-offset-2">
                              Privacy Policy
                            </Link>
                          </>
                        }
                      />
                    </div>

                    <VeyroButton
                      type="button"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        if (validateDetails()) setStep(1);
                      }}
                    >
                      Continue to vehicle
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </VeyroButton>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-studio-tint">
                        <CarFront aria-hidden="true" className="h-5 w-5 text-studio-ink" />
                      </span>
                      <div>
                        <h2 className="font-display text-2xl font-extrabold text-studio-ink">
                          Add your first vehicle
                        </h2>
                        <p className="mt-1 text-sm text-studio-muted">
                          Optional. You can skip this and add a vehicle later.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="vehicle-make" label="Make" error={errors.make}>
                        <Input
                          id="vehicle-make"
                          placeholder="Toyota"
                          value={make}
                          invalid={Boolean(errors.make)}
                          aria-describedby={errors.make ? 'vehicle-make-error' : undefined}
                          onChange={(event) => setMake(event.currentTarget.value)}
                        />
                      </Field>
                      <Field id="vehicle-model" label="Model" error={errors.model}>
                        <Input
                          id="vehicle-model"
                          placeholder="Camry"
                          value={model}
                          invalid={Boolean(errors.model)}
                          aria-describedby={errors.model ? 'vehicle-model-error' : undefined}
                          onChange={(event) => setModel(event.currentTarget.value)}
                        />
                      </Field>
                      <Field id="vehicle-category" label="Category" error={errors.category}>
                        <Select
                          id="vehicle-category"
                          value={category}
                          invalid={Boolean(errors.category)}
                          aria-describedby={errors.category ? 'vehicle-category-error' : undefined}
                          onChange={(event) => setCategory(event.currentTarget.value)}
                        >
                          <option value="">Select category</option>
                          {categories.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        id="vehicle-transmission"
                        label="Transmission"
                        error={errors.transmission}
                      >
                        <Select
                          id="vehicle-transmission"
                          value={transmission}
                          invalid={Boolean(errors.transmission)}
                          aria-describedby={
                            errors.transmission ? 'vehicle-transmission-error' : undefined
                          }
                          onChange={(event) => setTransmission(event.currentTarget.value)}
                        >
                          <option value="">Select transmission</option>
                          {transmissions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field id="vehicle-fuel" label="Fuel type" error={errors.fuelType}>
                        <Select
                          id="vehicle-fuel"
                          value={fuelType}
                          invalid={Boolean(errors.fuelType)}
                          aria-describedby={errors.fuelType ? 'vehicle-fuel-error' : undefined}
                          onChange={(event) => setFuelType(event.currentTarget.value)}
                        >
                          <option value="">Select fuel type</option>
                          {fuelTypes.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="flex items-start gap-2 rounded-panel bg-studio-tint p-4 text-xs leading-relaxed text-studio-muted">
                      <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                      Category and transmission are used for matching. Fuel is informational only.
                    </div>

                    {submitError ? (
                      <FormAlert tone="error" title="Could not save profile">
                        {submitError}
                      </FormAlert>
                    ) : null}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <VeyroButton
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="sm:w-auto"
                        onClick={() => {
                          setErrors({});
                          setStep(0);
                        }}
                      >
                        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                        Back
                      </VeyroButton>
                      <VeyroButton type="submit" size="lg" className="flex-1" loading={submitting}>
                        Finish setup
                      </VeyroButton>
                    </div>
                  </div>
                )}
              </form>
            )}
          </section>
        </div>
      </div>
    </StudioOnboardingShell>
  );
}
