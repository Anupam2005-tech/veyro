import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Database, Driver, DriverApplication, DriverDocument, User } from './types.js';

/**
 * Demo data for local development (docs/veyro.md §8.9 — synthetic data only).
 * Every account signs in passwordlessly with a one-time code that the dev API
 * returns in the response instead of emailing it.
 */
const DATA_DIR = resolve(process.env.VEYRO_DATA_DIR ?? resolve(process.cwd(), '.data'));

function iso(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function user(id: string, email: string, role: User['role'], name: string, phone: string): User {
  return {
    id,
    email,
    role,
    name,
    phone,
    status: 'ACTIVE',
    onboarded: true,
    consentAt: iso(),
    customerCancellationCount: 0,
    suspensionReason: null,
    suspendedAt: null,
    emergencyContacts: [],
    favouriteDriverIds: [],
    createdAt: iso(-30 * 86_400_000),
  };
}

/** Minimal valid one-page PDF with a line of text, used as a placeholder document. */
function placeholderPdf(text: string): Buffer {
  const content = `BT /F1 18 Tf 60 720 Td (${text.replace(/[()\\]/g, '')}) Tj 0 -30 Td /F1 12 Tf (Synthetic demo document - not a real ID.) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

function seedDocuments(driverId: string, name: string): DriverDocument[] {
  const dir = resolve(DATA_DIR, 'uploads', driverId);
  mkdirSync(dir, { recursive: true });
  const kinds: DriverDocument['kind'][] = ['LICENCE', 'GOVERNMENT_ID', 'PHOTO'];
  return kinds.map((kind, i) => {
    const id = `doc_${driverId}_${i}`;
    const buf = placeholderPdf(`${kind.replace('_', ' ')} - ${name}`);
    const storagePath = `drivers/${driverId}/${id}.pdf`;
    writeFileSync(resolve(dir, `${id}.pdf`), buf);
    return { id, kind, filename: `${kind.toLowerCase()}.pdf`, mime: 'application/pdf', size: buf.length, storagePath, uploadedAt: iso(-86_400_000) };
  });
}

interface DriverSeed {
  id: string;
  email: string;
  name: string;
  phone: string;
  rate: number;
  categories: string[];
  transmissions: string[];
  base: { label: string; lat: number; lng: number };
  languages: string[];
  years: number;
  rating: [number, number];
  bio: string;
}

const DRIVERS: DriverSeed[] = [
  {
    id: 'usr_driver_arjun', email: 'driver@veyro.test', name: 'Arjun Das', phone: '+919800000011', rate: 220,
    categories: ['HATCHBACK', 'SEDAN', 'SUV'], transmissions: ['MANUAL', 'AUTOMATIC'],
    base: { label: 'Park Street, Kolkata', lat: 22.5526, lng: 88.3525 }, languages: ['Bengali', 'Hindi', 'English'],
    years: 9, rating: [138, 29], bio: 'Former corporate chauffeur. Calm city driving, airport runs.',
  },
  {
    id: 'usr_driver_sourav', email: 'driver2@veyro.test', name: 'Sourav Ghosh', phone: '+919800000012', rate: 180,
    categories: ['HATCHBACK', 'SEDAN'], transmissions: ['MANUAL'],
    base: { label: 'City Centre, Salt Lake', lat: 22.588, lng: 88.408 }, languages: ['Bengali', 'Hindi'],
    years: 5, rating: [92, 21], bio: 'Knows every shortcut between Salt Lake and the airport.',
  },
  {
    id: 'usr_driver_imran', email: 'driver3@veyro.test', name: 'Imran Ali', phone: '+919800000013', rate: 260,
    categories: ['SEDAN', 'SUV', 'MUV'], transmissions: ['MANUAL', 'AUTOMATIC'],
    base: { label: 'Gariahat, Kolkata', lat: 22.519, lng: 88.366 }, languages: ['Hindi', 'Urdu', 'English', 'Bengali'],
    years: 12, rating: [196, 40], bio: 'SUV and automatic specialist. Outstation trips on request.',
  },
];

export function seedDatabase(db: Database): void {
  db.users.push(user('usr_admin', 'admin@veyro.test', 'ADMIN', 'Veyro Admin', '+919800000001'));

  const customer = user('usr_customer_riya', 'customer@veyro.test', 'CUSTOMER', 'Riya Sen', '+919800000021');
  customer.emergencyContacts = [
    { id: 'ec_1', name: 'Ananya Sen (demo)', phone: '+919800000031' },
    { id: 'ec_2', name: 'Rahul Sen (demo)', phone: '+919800000032' },
  ];
  db.users.push(customer);
  db.vehicles.push(
    {
      id: 'veh_swift', customerId: customer.id, make: 'Maruti Suzuki', model: 'Swift', plate: 'WB 02 AB 1234',
      category: 'HATCHBACK', transmission: 'MANUAL', fuelType: 'PETROL', isDefault: true, createdAt: iso(),
    },
    {
      id: 'veh_creta', customerId: customer.id, make: 'Hyundai', model: 'Creta', plate: 'WB 06 CD 5678',
      category: 'SUV', transmission: 'AUTOMATIC', fuelType: 'DIESEL', isDefault: false, createdAt: iso(),
    },
  );

  for (const d of DRIVERS) {
    db.users.push(user(d.id, d.email, 'DRIVER', d.name, d.phone));
    const driver: Driver = {
      id: d.id,
      approvalStatus: 'APPROVED',
      isSuspended: false,
      isOnline: true,
      hourlyRateInr: d.rate,
      perKmRateInr: Math.round(d.rate / 12),
      categories: d.categories,
      transmissions: d.transmissions,
      serviceArea: { ...d.base, radiusKm: 25 },
      languages: d.languages,
      experienceYears: d.years,
      bio: d.bio,
      ratingSum: d.rating[0],
      ratingCount: d.rating[1],
      verifiedNoShowCount: 0,
      suspensionReason: null,
      suspendedAt: null,
      presence: null,
      simulated: true,
      lastDevicePostAt: null,
    };
    db.drivers.push(driver);
    const app: DriverApplication = {
      id: `app_${d.id}`,
      driverId: d.id,
      status: 'APPROVED',
      profile: { name: d.name, phone: d.phone, experienceYears: d.years, languages: d.languages, bio: d.bio },
      capabilities: { categories: d.categories, transmissions: d.transmissions },
      serviceArea: { ...d.base, radiusKm: 25 },
      rates: { hourlyRateInr: d.rate, perKmRateInr: driver.perKmRateInr },
      documents: seedDocuments(d.id, d.name),
      reviewReason: 'Documents verified (seed data).',
      requestedChanges: [],
      reviewedBy: 'usr_admin',
      reviewedAt: iso(-20 * 86_400_000),
      submittedAt: iso(-21 * 86_400_000),
      updatedAt: iso(-20 * 86_400_000),
    };
    db.applications.push(app);
  }

  // A pending applicant so the Admin queue has something to review.
  const applicantId = 'usr_driver_priya';
  db.users.push(user(applicantId, 'applicant@veyro.test', 'DRIVER', 'Priya Mondal', '+919800000014'));
  const base = { label: 'Salt Lake Sector V, Kolkata', lat: 22.5726, lng: 88.4325 };
  db.drivers.push({
    id: applicantId, approvalStatus: 'PENDING_REVIEW', isSuspended: false, isOnline: false, hourlyRateInr: 200,
    perKmRateInr: null, categories: ['HATCHBACK', 'SEDAN'], transmissions: ['AUTOMATIC'], serviceArea: { ...base, radiusKm: 15 },
    languages: ['Bengali', 'English'], experienceYears: 4, bio: 'Automatic hatchbacks and sedans.', ratingSum: 0, ratingCount: 0,
    verifiedNoShowCount: 0, suspensionReason: null, suspendedAt: null, presence: null, simulated: false, lastDevicePostAt: null,
  });
  db.applications.push({
    id: `app_${applicantId}`, driverId: applicantId, status: 'PENDING_REVIEW',
    profile: { name: 'Priya Mondal', phone: '+919800000014', experienceYears: 4, languages: ['Bengali', 'English'], bio: 'Automatic hatchbacks and sedans.' },
    capabilities: { categories: ['HATCHBACK', 'SEDAN'], transmissions: ['AUTOMATIC'] },
    serviceArea: { ...base, radiusKm: 15 },
    rates: { hourlyRateInr: 200, perKmRateInr: null },
    documents: seedDocuments(applicantId, 'Priya Mondal'),
    reviewReason: null, requestedChanges: [], reviewedBy: null, reviewedAt: null,
    submittedAt: iso(-3_600_000), updatedAt: iso(-3_600_000),
  });
}
