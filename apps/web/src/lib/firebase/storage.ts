import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTask,
} from 'firebase/storage';
import { getClientFirebaseApp } from './client';

export type DriverDocumentKind = 'LICENCE' | 'GOVERNMENT_ID' | 'PROFILE_PHOTO';
export type CustomerDocumentKind = 'PROFILE_PHOTO' | 'VEHICLE_RC' | 'INSURANCE';

export function driverDocumentPath(
  uid: string,
  kind: DriverDocumentKind,
  fileName: string
): string {
  const extension = fileName.includes('.')
    ? fileName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin'
    : 'bin';
  return `drivers/${uid}/documents/${kind.toLowerCase()}-${Date.now()}.${extension}`;
}

export function customerDocumentPath(
  uid: string,
  kind: CustomerDocumentKind,
  fileName: string
): string {
  const extension = fileName.includes('.')
    ? fileName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin'
    : 'bin';
  return `customers/${uid}/documents/${kind.toLowerCase()}-${Date.now()}.${extension}`;
}

export function uploadDriverDocument(
  uid: string,
  kind: DriverDocumentKind,
  file: File
): UploadTask {
  const path = driverDocumentPath(uid, kind, file.name);
  const storageRef = ref(getStorage(getClientFirebaseApp()), path);
  return uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      uploadedBy: uid,
      documentKind: kind,
    },
  });
}

export function uploadCustomerDocument(
  uid: string,
  kind: CustomerDocumentKind,
  file: File
): UploadTask {
  const path = customerDocumentPath(uid, kind, file.name);
  const storageRef = ref(getStorage(getClientFirebaseApp()), path);
  return uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      uploadedBy: uid,
      documentKind: kind,
    },
  });
}

export async function getStorageFileUrl(fullPath: string): Promise<string> {
  const storageRef = ref(getStorage(getClientFirebaseApp()), fullPath);
  return getDownloadURL(storageRef);
}
