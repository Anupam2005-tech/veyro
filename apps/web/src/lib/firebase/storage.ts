import {
  getStorage,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';
import { getClientFirebaseApp } from './client';

export type DriverDocumentKind = 'LICENCE' | 'GOVERNMENT_ID' | 'PROFILE_PHOTO';

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
