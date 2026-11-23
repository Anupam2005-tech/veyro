import { randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';

export function verifyDocument(buffer: Buffer, type: string) {
  if (!buffer.length || buffer.length > 10_000_000) throw new AppError(400, 'INVALID_DOCUMENT_SIZE', 'Documents must be at most 10 MB.');
  const valid = type === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
    type === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    type === 'application/pdf' && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (!valid) throw new AppError(400, 'INVALID_DOCUMENT_TYPE', 'Provide JPEG, PNG or PDF content.');
}
export async function uploadDocument(uid: string, kind: string, buffer: Buffer, type: string) {
  if (!['LICENCE', 'GOVERNMENT_ID', 'PROFILE_PHOTO'].includes(kind)) throw new AppError(400, 'INVALID_DOCUMENT_KIND', 'Invalid document kind.');
  verifyDocument(buffer, type);
  if (kind === 'PROFILE_PHOTO' && type === 'application/pdf') throw new AppError(400, 'INVALID_DOCUMENT_TYPE', 'A profile photo must be an image.');
  const app = getFirebaseAdminApp();
  if (!app.options.storageBucket) throw new AppError(503, 'STORAGE_UNAVAILABLE', 'Configure private document storage.');
  const id = randomUUID(), storagePath = 'private/driver-documents/' + uid + '/' + id;
  const file = getStorage(app).bucket().file(storagePath);
  await file.save(buffer, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 },
    metadata: { contentType: type, cacheControl: 'private, no-store', metadata: { uid, kind } } });
  const [metadata] = await file.getMetadata();
  const generation = String(metadata.generation ?? '');
  if (!/^\d+$/.test(generation)) throw new Error('Immutable upload generation unavailable');
  // If the metadata write fails the private orphan can be removed by retention cleanup.
  await getFirestore(app).collection('driverUploads').doc(id).create({ uid, kind, storagePath,
    generation, contentType: type, size: buffer.length, verified: true,
    createdAt: Date.now() });
  return { id, kind, storagePath, contentType: type, size: buffer.length };
}

export async function uploadCustomerAvatar(uid: string, buffer: Buffer, type: string) {
  verifyDocument(buffer, type);
  if (type !== 'image/jpeg' && type !== 'image/png') throw new AppError(400, 'INVALID_DOCUMENT_TYPE', 'Choose a JPEG or PNG photo.');
  const app = getFirebaseAdminApp();
  if (!app.options.storageBucket) throw new AppError(503, 'STORAGE_UNAVAILABLE', 'Private storage is unavailable.');
  const file = getStorage(app).bucket().file('private/customer-photos/' + uid + '/' + randomUUID());
  await file.save(buffer, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: type, cacheControl: 'private, no-store' } });
  const [metadata] = await file.getMetadata();
  const generation = String(metadata.generation ?? '');
  if (!/^\d+$/.test(generation)) throw new Error('Immutable photo generation unavailable');
  await getFirestore(app).collection('users').doc(uid).update({ avatar: { storagePath: file.name, generation, contentType: type } });
  return { saved: true };
}
