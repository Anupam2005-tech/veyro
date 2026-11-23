export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
export const DOCUMENT_MAX_BYTES = 10_000_000;
const DOCUMENT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
const DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export function validateEmail(value: string): string | null {
  if (!value.trim()) {
    return 'Enter your email address.';
  }
  if (!EMAIL_PATTERN.test(value.trim())) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function validateE164Phone(value: string): string | null {
  if (!value.trim()) {
    return 'Enter your phone number.';
  }
  if (!E164_PATTERN.test(value.trim())) {
    return 'Use international format, for example +919876543210.';
  }
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `Enter ${label}.`;
}

export function validateDocumentFile(file: File): string | null {
  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase() ?? ''
    : '';

  if (!DOCUMENT_EXTENSIONS.includes(extension)) {
    return 'Use a JPG, PNG or PDF file.';
  }

  if (file.type && !DOCUMENT_MIME_TYPES.includes(file.type)) {
    return 'That file type is not supported.';
  }

  if (file.size > DOCUMENT_MAX_BYTES) {
    return 'Files must be 10 MB or smaller.';
  }

  if (file.size === 0) {
    return 'That file is empty.';
  }

  return null;
}
