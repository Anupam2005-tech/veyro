'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { BellRing, CarFront, ContactRound, Plus, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import {
  CheckboxField,
  DemoBadge,
  Field,
  FormAlert,
  Input,
  LoadingState,
  Select,
  VeyroButton,
} from '@veyro/ui';
import { getCustomerDetails, saveCustomerDetails } from '@/lib/api/client';
import type {
  BookingVehicle,
  CustomerNotificationPreferences,
  CustomerPrivacyPreferences,
  CustomerProfileDetails,
  EmergencyContact,
  VehicleTransmission,
} from '@/lib/api/types';
import { useSession } from '@/lib/auth/session-provider';
import { isDemoDataMode } from '@/lib/env';
import { validateE164Phone, validateRequired } from '@/lib/validation';
import { CustomerShell } from './customer-shell';

const categories = ['Hatchback', 'Sedan', 'SUV', 'MPV', 'Luxury'] as const;
const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'] as const;

const defaultNotifications: CustomerNotificationPreferences = {
  bookingUpdates: true,
  tripStatus: true,
  safetyAlerts: true,
  serviceMessages: false,
};

const defaultPrivacy: CustomerPrivacyPreferences = {
  tripSharing: true,
  matchingProfile: true,
  analytics: false,
};

function localId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyVehicle(): BookingVehicle {
  return {
    id: localId('vehicle'),
    make: '',
    model: '',
    category: 'Sedan',
    transmission: 'AUTOMATIC',
    fuelType: 'Petrol',
    registrationNumber: '',
  };
}

function emptyContact(): EmergencyContact {
  return {
    id: localId('contact'),
    name: '',
    relationship: '',
    phone: '',
  };
}

export default function CustomerProfile() {
  const searchParams = useSearchParams();
  const { user, refreshProfile } = useSession();
  const [details, setDetails] = React.useState<CustomerProfileDetails | null>(null);
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [vehicles, setVehicles] = React.useState<BookingVehicle[]>([]);
  const [contacts, setContacts] = React.useState<EmergencyContact[]>([]);
  const [notifications, setNotifications] = React.useState<CustomerNotificationPreferences>(
    defaultNotifications
  );
  const [privacy, setPrivacy] = React.useState<CustomerPrivacyPreferences>(defaultPrivacy);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const balancePreview = searchParams.get('balance') === '1';

  React.useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getCustomerDetails(user)
      .then((next) => {
        if (!active) {
          return;
        }
        setDetails(next);
        setFullName(next.fullName === 'Veyro Customer' ? '' : next.fullName);
        setPhone(next.phone ?? '');
        setVehicles(next.vehicles);
        setContacts(next.emergencyContacts);
        setNotifications(next.notifications);
        setPrivacy(next.privacy);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load your profile.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    const nameError = validateRequired(fullName, 'your full name');
    const phoneError = validateE164Phone(phone);
    if (nameError) next.fullName = nameError;
    if (phoneError) next.phone = phoneError;

    vehicles.forEach((vehicle, index) => {
      if (!vehicle.make.trim()) next[`vehicle-${index}-make`] = 'Enter the make.';
      if (!vehicle.model.trim()) next[`vehicle-${index}-model`] = 'Enter the model.';
      if (!vehicle.registrationNumber?.trim()) {
        next[`vehicle-${index}-registration`] = 'Enter the registration number.';
      }
    });

    contacts.forEach((contact, index) => {
      if (!contact.name.trim()) next[`contact-${index}-name`] = 'Enter a name.';
      if (!contact.relationship.trim()) next[`contact-${index}-relationship`] = 'Enter a relationship.';
      const contactPhoneError = validateE164Phone(contact.phone);
      if (contactPhoneError) next[`contact-${index}-phone`] = contactPhoneError;
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !validate()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await saveCustomerDetails(user, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        vehicles,
        emergencyContacts: contacts,
        notifications,
        privacy,
      });
      setDetails(updated);
      await refreshProfile();
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  function updateVehicle(index: number, patch: Partial<BookingVehicle>) {
    setVehicles((current) =>
      current.map((vehicle, vehicleIndex) =>
        vehicleIndex === index ? { ...vehicle, ...patch } : vehicle
      )
    );
  }

  function updateContact(index: number, patch: Partial<EmergencyContact>) {
    setContacts((current) =>
      current.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, ...patch } : contact
      )
    );
  }

  const unpaidBalance = balancePreview ? 187 : details?.unpaidBalance ?? 0;

  return (
    <CustomerShell subtitle="Profile, vehicles and emergency contacts">
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-studio-muted">
              Customer profile
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold text-studio-ink">
              Your details, ready to ride
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-studio-muted">
              Keep your vehicle pass current and add people who should be reachable if a trip needs
              attention.
            </p>
          </div>
          {isDemoDataMode ? <DemoBadge label="Demo profile" /> : null}
        </div>

        {unpaidBalance > 0 ? (
          <div className="mt-6">
            <FormAlert tone={details?.disputedAmountUnderReview ? 'info' : 'warning'} title="Outstanding balance">
              ₹{unpaidBalance} is recorded on this profile. Confirmed unpaid balances block new
              bookings; disputed amounts remain under review under the approved policy.
            </FormAlert>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6">
            <FormAlert tone="error" title="Profile issue">{error}</FormAlert>
          </div>
        ) : null}

        {success ? (
          <div className="mt-6">
            <FormAlert tone="success" title="Profile saved">
              Your customer profile is up to date.
            </FormAlert>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6">
            <LoadingState label="Loading your profile…" />
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(event) => void handleSave(event)} noValidate>
            <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
              <h2 className="font-display text-xl font-extrabold text-studio-ink">Contact details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field id="profile-name" label="Full name" required error={errors.fullName}>
                  <div className="input-glow rounded-panel">
                    <Input
                      id="profile-name"
                      value={fullName}
                      invalid={Boolean(errors.fullName)}
                      onChange={(event) => setFullName(event.currentTarget.value)}
                    />
                  </div>
                </Field>
                <Field
                  id="profile-phone"
                  label="Contact phone"
                  required
                  error={errors.phone}
                  hint="International format, for example +919876543210."
                >
                  <div className="input-glow rounded-panel">
                    <Input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      invalid={Boolean(errors.phone)}
                      onChange={(event) => setPhone(event.currentTarget.value)}
                    />
                  </div>
                </Field>
              </div>
            </section>

            <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Vehicles</h2>
                  <p className="mt-1 text-xs text-studio-muted">
                    Category and transmission drive driver compatibility. Fuel is informational.
                  </p>
                </div>
                <VeyroButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setVehicles((current) => [...current, emptyVehicle()])}
                >
                  <Plus aria-hidden="true" className="h-4 w-4" /> Add vehicle
                </VeyroButton>
              </div>

              {vehicles.length === 0 ? (
                <p className="mt-4 rounded-panel bg-studio-tint p-3 text-sm text-studio-muted">
                  No vehicle yet. Add one to unlock compatible driver matching.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {vehicles.map((vehicle, index) => (
                    <div
                      key={vehicle.id}
                      className="rounded-panel border border-studio-border bg-white p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="inline-flex items-center gap-2 text-sm font-bold text-studio-ink">
                          <CarFront aria-hidden="true" className="h-4 w-4" /> Vehicle {index + 1}
                        </p>
                        <VeyroButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove vehicle ${index + 1}`}
                          onClick={() => setVehicles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </VeyroButton>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Field id={`vehicle-${index}-make`} label="Make" error={errors[`vehicle-${index}-make`]}>
                          <div className="input-glow rounded-panel">
                            <Input
                              id={`vehicle-${index}-make`}
                              value={vehicle.make}
                              onChange={(event) => updateVehicle(index, { make: event.currentTarget.value })}
                            />
                          </div>
                        </Field>
                        <Field id={`vehicle-${index}-model`} label="Model" error={errors[`vehicle-${index}-model`]}>
                          <div className="input-glow rounded-panel">
                            <Input
                              id={`vehicle-${index}-model`}
                              value={vehicle.model}
                              onChange={(event) => updateVehicle(index, { model: event.currentTarget.value })}
                            />
                          </div>
                        </Field>
                        <Field
                          id={`vehicle-${index}-registration`}
                          label="Registration"
                          error={errors[`vehicle-${index}-registration`]}
                        >
                          <div className="input-glow rounded-panel">
                            <Input
                              id={`vehicle-${index}-registration`}
                              value={vehicle.registrationNumber ?? ''}
                              onChange={(event) =>
                                updateVehicle(index, { registrationNumber: event.currentTarget.value })
                              }
                            />
                          </div>
                        </Field>
                        <Field id={`vehicle-${index}-category`} label="Category">
                          <div className="input-glow rounded-panel">
                            <Select
                              id={`vehicle-${index}-category`}
                              value={vehicle.category}
                              onChange={(event) => updateVehicle(index, { category: event.currentTarget.value })}
                            >
                              {categories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </Field>
                        <Field id={`vehicle-${index}-transmission`} label="Transmission">
                          <div className="input-glow rounded-panel">
                            <Select
                              id={`vehicle-${index}-transmission`}
                              value={vehicle.transmission}
                              onChange={(event) =>
                                updateVehicle(index, {
                                  transmission: event.currentTarget.value as VehicleTransmission,
                                })
                              }
                            >
                              <option value="AUTOMATIC">Automatic</option>
                              <option value="MANUAL">Manual</option>
                            </Select>
                          </div>
                        </Field>
                        <Field id={`vehicle-${index}-fuel`} label="Fuel type">
                          <div className="input-glow rounded-panel">
                            <Select
                              id={`vehicle-${index}-fuel`}
                              value={vehicle.fuelType}
                              onChange={(event) => updateVehicle(index, { fuelType: event.currentTarget.value })}
                            >
                              {fuelTypes.map((fuel) => (
                                <option key={fuel} value={fuel}>
                                  {fuel}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">
                    Emergency contacts
                  </h2>
                  <p className="mt-1 text-xs text-studio-muted">
                    Used only for verified trip safety actions. No external message is sent in demo mode.
                  </p>
                </div>
                <VeyroButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setContacts((current) => [...current, emptyContact()])}
                >
                  <ContactRound aria-hidden="true" className="h-4 w-4" /> Add contact
                </VeyroButton>
              </div>

              {contacts.length === 0 ? (
                <p className="mt-4 rounded-panel bg-studio-tint p-3 text-sm text-studio-muted">
                  No emergency contacts added.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {contacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className="rounded-panel border border-studio-border bg-white p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-studio-ink">Contact {index + 1}</p>
                        <VeyroButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove contact ${index + 1}`}
                          onClick={() => setContacts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </VeyroButton>
                      </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <Field id={`contact-${index}-name`} label="Name" error={errors[`contact-${index}-name`]}>
                          <div className="input-glow rounded-panel">
                            <Input
                              id={`contact-${index}-name`}
                              value={contact.name}
                              onChange={(event) => updateContact(index, { name: event.currentTarget.value })}
                            />
                          </div>
                        </Field>
                        <Field
                          id={`contact-${index}-relationship`}
                          label="Relationship"
                          error={errors[`contact-${index}-relationship`]}
                        >
                          <div className="input-glow rounded-panel">
                            <Input
                              id={`contact-${index}-relationship`}
                              value={contact.relationship}
                              onChange={(event) =>
                                updateContact(index, { relationship: event.currentTarget.value })
                              }
                            />
                          </div>
                        </Field>
                        <Field
                          id={`contact-${index}-phone`}
                          label="Phone"
                          error={errors[`contact-${index}-phone`]}
                        >
                          <div className="input-glow rounded-panel">
                            <Input
                              id={`contact-${index}-phone`}
                              type="tel"
                              value={contact.phone}
                              onChange={(event) => updateContact(index, { phone: event.currentTarget.value })}
                            />
                          </div>
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <BellRing aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                <div>
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">
                    Notifications
                  </h2>
                  <p className="mt-1 text-xs text-studio-muted">
                    Choose what Veyro may notify you about. Safety messages remain visible in the app.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <CheckboxField
                  id="notify-booking"
                  label="Booking updates"
                  description="Quote acceptance, driver assignment and cancellations."
                  checked={notifications.bookingUpdates}
                  onChange={(bookingUpdates) =>
                    setNotifications((current) => ({ ...current, bookingUpdates }))
                  }
                />
                <CheckboxField
                  id="notify-trip"
                  label="Trip status"
                  description="Pickup, arrival and completion milestones."
                  checked={notifications.tripStatus}
                  onChange={(tripStatus) => setNotifications((current) => ({ ...current, tripStatus }))}
                />
                <CheckboxField
                  id="notify-safety"
                  label="Safety alerts"
                  description="SOS acknowledgement and emergency contact updates."
                  checked={notifications.safetyAlerts}
                  onChange={(safetyAlerts) =>
                    setNotifications((current) => ({ ...current, safetyAlerts }))
                  }
                />
                <CheckboxField
                  id="notify-service"
                  label="Service messages"
                  description="Occasional product news and policy changes."
                  checked={notifications.serviceMessages}
                  onChange={(serviceMessages) =>
                    setNotifications((current) => ({ ...current, serviceMessages }))
                  }
                />
              </div>
            </section>

            <section className="rounded-card border border-studio-border bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck aria-hidden="true" className="h-5 w-5 text-studio-muted" />
                <div>
                  <h2 className="font-display text-xl font-extrabold text-studio-ink">Privacy</h2>
                  <p className="mt-1 text-xs text-studio-muted">
                    Share links always reveal only the live trip location while active. These controls
                    shape default matching and optional measurement.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <CheckboxField
                  id="privacy-sharing"
                  label="Allow trip sharing links"
                  description="Let a completed booking create a signed-in, read-only share link."
                  checked={privacy.tripSharing}
                  onChange={(tripSharing) => setPrivacy((current) => ({ ...current, tripSharing }))}
                />
                <CheckboxField
                  id="privacy-matching"
                  label="Use profile for driver matching"
                  description="Share vehicle category and service area with candidate drivers."
                  checked={privacy.matchingProfile}
                  onChange={(matchingProfile) =>
                    setPrivacy((current) => ({ ...current, matchingProfile }))
                  }
                />
                <CheckboxField
                  id="privacy-analytics"
                  label="Anonymous product analytics"
                  description="Optional, aggregated usage signals. Never trip or payment details."
                  checked={privacy.analytics}
                  onChange={(analytics) => setPrivacy((current) => ({ ...current, analytics }))}
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-studio-border bg-studio-surface p-4">
              <p className="inline-flex items-center gap-2 text-xs text-studio-muted">
                <Wallet aria-hidden="true" className="h-4 w-4" />
                Platform fee is ₹0 and driver commission is 0% in Release 1.
              </p>
              <VeyroButton type="submit" loading={saving}>
                Save profile
              </VeyroButton>
            </div>
          </form>
        )}
      </div>
    </CustomerShell>
  );
}
