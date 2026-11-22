import type { AuthUser } from './auth/types';

export const DEMO_USER: AuthUser = {
  uid: 'demo-reviewer',
  email: 'review@veyro.demo',
  phoneNumber: '+919800000000',
  displayName: 'Veyro Demo Reviewer',
  getIdToken: async () => 'demo-token',
};
