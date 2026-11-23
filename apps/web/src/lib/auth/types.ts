export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified?: boolean;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL?: string | null;
  getIdToken: () => Promise<string>;
}

export interface AuthFlowError extends Error {
  code: string;
  email?: string | null;
}

export interface PhoneConfirmation {
  confirm: (code: string) => Promise<AuthUser>;
}
