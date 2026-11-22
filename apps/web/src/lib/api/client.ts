import type { ApiResponse } from '@veyro/contracts';
import type { AuthUser } from '../auth/types';
import { apiBaseUrl, isDemoDataMode } from '../env';
import {
  bootstrapDemoSession,
  getDemoApplication,
  resubmitDriverApplicationDemo,
  saveCustomerOnboardingDemo,
  saveDriverApplicationDemo,
} from './demo';
import {
  cancelBookingDemo,
  createBookingDemo,
  createQuoteDemo,
  getCustomerDetailsDemo,
  listBookingsDemo,
  saveCustomerDetailsDemo,
  searchDriversDemo,
  setDriverFavouriteDemo,
} from './demo-booking';
import {
  advanceTripStageDemo,
  createShareLinkDemo,
  createTripReportDemo,
  driverSafetyControlDemo,
  getAdminApplicationDemo,
  getAdminCustomerDemo,
  getAdminCustomersDemo,
  getAdminOverviewDemo,
  getAdminReportsDemo,
  restoreAdminCustomerDemo,
  getDriverEarningsDemo,
  getDriverOffersDemo,
  getDriverProfileDemo,
  getSharedTripDemo,
  getTripDemo,
  payTripDemo,
  respondToOfferDemo,
  resolveReportDemo,
  reviewAdminApplicationDemo,
  revokeShareLinkDemo,
  saveDriverProfileDemo,
  setDriverOnlineDemo,
  submitTripRatingDemo,
  triggerSosDemo,
} from './demo-product';
import type {
  AdminReviewInput,
  BookingQuote,
  BookingQuoteRequest,
  BookingRecord,
  CustomerAccountRecord,
  CustomerOnboardingInput,
  CustomerProfileDetails,
  CustomerProfileUpdate,
  DriverApplicationInput,
  DriverApplicationStatus,
  DriverCandidate,
  DriverProfileUpdate,
  DriverSearchFilters,
  RatingSubmission,
  ReportResolutionInput,
  ReportSubmission,
  RoleIntent,
  VeyroProfile,
  BookingVehicle,
} from './types';

export class ApiClientError extends Error {
  code: string;

  constructor(message: string, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

export interface DriverApplicationView {
  status: DriverApplicationStatus | null;
  adminReason?: string;
  submittedAt?: string;
}

async function request<T>(
  path: string,
  init: RequestInit,
  token: string
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError('The server returned an unreadable response.', 'INVALID_RESPONSE');
  }

  if (!payload.success || !response.ok) {
    const errorPayload = 'error' in payload ? payload.error : undefined;
    throw new ApiClientError(payload.message, errorPayload?.code);
  }

  return payload.data;
}

export async function bootstrapSession(
  user: AuthUser,
  roleIntent: RoleIntent | null
): Promise<VeyroProfile> {
  if (isDemoDataMode) {
    return bootstrapDemoSession(user, roleIntent);
  }

  const token = await user.getIdToken();
  return request<VeyroProfile>(
    '/auth/session',
    { method: 'POST', body: JSON.stringify({ roleIntent }) },
    token
  );
}

export async function saveCustomerOnboarding(
  user: AuthUser,
  input: CustomerOnboardingInput
): Promise<VeyroProfile> {
  if (isDemoDataMode) {
    return saveCustomerOnboardingDemo(user.uid, input);
  }

  const token = await user.getIdToken();
  return request<VeyroProfile>(
    '/customers/onboarding',
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function saveDriverApplication(
  user: AuthUser,
  input: DriverApplicationInput
): Promise<VeyroProfile> {
  if (isDemoDataMode) {
    return saveDriverApplicationDemo(user.uid, input);
  }

  const token = await user.getIdToken();
  return request<VeyroProfile>(
    '/drivers/applications',
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function getDriverApplication(
  user: AuthUser
): Promise<DriverApplicationView> {
  if (isDemoDataMode) {
    const application = getDemoApplication(user.uid);
    return {
      status: application?.status ?? null,
      adminReason: application?.adminReason,
      submittedAt: application?.submittedAt,
    };
  }

  const token = await user.getIdToken();
  return request<DriverApplicationView>(
    '/drivers/applications/me',
    { method: 'GET' },
    token
  );
}

export async function resubmitDriverApplication(
  user: AuthUser
): Promise<VeyroProfile> {
  if (isDemoDataMode) {
    return resubmitDriverApplicationDemo(user.uid);
  }

  const token = await user.getIdToken();
  return request<VeyroProfile>(
    '/drivers/applications/resubmit',
    { method: 'POST' },
    token
  );
}

export async function searchDrivers(
  user: AuthUser,
  vehicle: BookingVehicle,
  filters: DriverSearchFilters
): Promise<DriverCandidate[]> {
  if (isDemoDataMode) {
    return searchDriversDemo(vehicle, filters);
  }

  const token = await user.getIdToken();
  return request<DriverCandidate[]>(
    '/drivers/search',
    { method: 'POST', body: JSON.stringify({ vehicle, filters }) },
    token
  );
}

export async function requestBookingQuote(
  user: AuthUser,
  input: BookingQuoteRequest
): Promise<BookingQuote> {
  if (isDemoDataMode) {
    return createQuoteDemo(input);
  }

  const token = await user.getIdToken();
  return request<BookingQuote>(
    '/bookings/quotes',
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function createBooking(
  user: AuthUser,
  input: BookingQuoteRequest,
  quote: BookingQuote
): Promise<BookingRecord> {
  if (isDemoDataMode) {
    return createBookingDemo(user.uid, input, quote);
  }

  const token = await user.getIdToken();
  return request<BookingRecord>(
    '/bookings',
    { method: 'POST', body: JSON.stringify({ request: input, quote }) },
    token
  );
}

export async function listBookings(user: AuthUser): Promise<BookingRecord[]> {
  if (isDemoDataMode) {
    return listBookingsDemo(user.uid);
  }

  const token = await user.getIdToken();
  return request<BookingRecord[]>('/bookings', { method: 'GET' }, token);
}

export async function cancelBooking(
  user: AuthUser,
  bookingId: string,
  reason: string
): Promise<BookingRecord[]> {
  if (isDemoDataMode) {
    return cancelBookingDemo(user.uid, bookingId, reason);
  }

  const token = await user.getIdToken();
  return request<BookingRecord[]>(
    `/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason }) },
    token
  );
}

export async function getCustomerDetails(
  user: AuthUser
): Promise<CustomerProfileDetails> {
  if (isDemoDataMode) {
    return getCustomerDetailsDemo(user);
  }

  const token = await user.getIdToken();
  return request<CustomerProfileDetails>('/customers/me', { method: 'GET' }, token);
}

export async function saveCustomerDetails(
  user: AuthUser,
  input: CustomerProfileUpdate
): Promise<CustomerProfileDetails> {
  if (isDemoDataMode) {
    return saveCustomerDetailsDemo(user, input);
  }

  const token = await user.getIdToken();
  return request<CustomerProfileDetails>(
    '/customers/me',
    { method: 'PATCH', body: JSON.stringify(input) },
    token
  );
}

export async function getTrip(user: AuthUser, tripId: string) {
  if (isDemoDataMode) {
    return getTripDemo(user.uid, tripId);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getTripDemo>>>(
    `/trips/${encodeURIComponent(tripId)}`,
    { method: 'GET' },
    token
  );
}

export async function advanceTripStage(
  user: AuthUser,
  tripId: string,
  action: 'ARRIVED' | 'START' | 'END' | 'NO_SHOW_REQUEST',
  input: { otp?: string } = {}
) {
  if (isDemoDataMode) {
    return advanceTripStageDemo(user.uid, tripId, action, input);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof advanceTripStageDemo>>>(
    `/trips/${encodeURIComponent(tripId)}/${action.toLowerCase()}`,
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function triggerSos(user: AuthUser, tripId: string) {
  if (isDemoDataMode) {
    return triggerSosDemo(user.uid, tripId);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof triggerSosDemo>>>(
    `/trips/${encodeURIComponent(tripId)}/sos`,
    { method: 'POST' },
    token
  );
}

export async function createTripShare(user: AuthUser, tripId: string) {
  if (isDemoDataMode) {
    return createShareLinkDemo(user.uid, tripId);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof createShareLinkDemo>>>(
    `/trips/${encodeURIComponent(tripId)}/shares`,
    { method: 'POST' },
    token
  );
}

export async function revokeTripShare(user: AuthUser, tripId: string) {
  if (isDemoDataMode) {
    return revokeShareLinkDemo(user.uid, tripId);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof revokeShareLinkDemo>>>(
    `/trips/${encodeURIComponent(tripId)}/shares/revoke`,
    { method: 'POST' },
    token
  );
}

export async function getSharedTrip(user: AuthUser, token: string) {
  if (isDemoDataMode) {
    return getSharedTripDemo(token);
  }

  const authToken = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getSharedTripDemo>>>(
    `/shares/${encodeURIComponent(token)}`,
    { method: 'GET' },
    authToken
  );
}

export async function submitTripRating(
  user: AuthUser,
  tripId: string,
  input: RatingSubmission
) {
  if (isDemoDataMode) {
    return submitTripRatingDemo(user.uid, tripId, input);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof submitTripRatingDemo>>>(
    `/trips/${encodeURIComponent(tripId)}/rating`,
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function createTripReport(user: AuthUser, input: ReportSubmission) {
  if (isDemoDataMode) {
    return createTripReportDemo(user.uid, input);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof createTripReportDemo>>>(
    '/reports',
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function payTrip(user: AuthUser, tripId: string) {
  if (isDemoDataMode) {
    return payTripDemo(user.uid, tripId);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof payTripDemo>>>(
    `/trips/${encodeURIComponent(tripId)}/payments`,
    { method: 'POST' },
    token
  );
}

export async function getDriverOffers(user: AuthUser) {
  if (isDemoDataMode) {
    return getDriverOffersDemo(user.uid);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getDriverOffersDemo>>>(
    '/drivers/offers',
    { method: 'GET' },
    token
  );
}

export async function respondToDriverOffer(
  user: AuthUser,
  offerId: string,
  action: 'ACCEPT' | 'DECLINE'
) {
  if (isDemoDataMode) {
    return respondToOfferDemo(user.uid, offerId, action);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof respondToOfferDemo>>>(
    `/drivers/offers/${encodeURIComponent(offerId)}/${action.toLowerCase()}`,
    { method: 'POST' },
    token
  );
}

export async function setDriverOnline(user: AuthUser, online: boolean) {
  if (isDemoDataMode) {
    return setDriverOnlineDemo(user.uid, online);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof setDriverOnlineDemo>>>(
    '/drivers/availability',
    { method: 'POST', body: JSON.stringify({ online }) },
    token
  );
}

export async function getDriverProfile(user: AuthUser) {
  if (isDemoDataMode) {
    return getDriverProfileDemo(user);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getDriverProfileDemo>>>(
    '/drivers/me',
    { method: 'GET' },
    token
  );
}

export async function saveDriverProfile(user: AuthUser, input: DriverProfileUpdate) {
  if (isDemoDataMode) {
    return saveDriverProfileDemo(user, input);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof saveDriverProfileDemo>>>(
    '/drivers/me',
    { method: 'PATCH', body: JSON.stringify(input) },
    token
  );
}

export async function getDriverEarnings(user: AuthUser) {
  if (isDemoDataMode) {
    return getDriverEarningsDemo(user.uid);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getDriverEarningsDemo>>>(
    '/drivers/earnings',
    { method: 'GET' },
    token
  );
}

export async function getAdminOverview(user: AuthUser) {
  if (isDemoDataMode) {
    return getAdminOverviewDemo(user.uid);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getAdminOverviewDemo>>>(
    '/admin/overview',
    { method: 'GET' },
    token
  );
}

export async function getAdminApplication(user: AuthUser, applicationId: string) {
  if (isDemoDataMode) {
    return getAdminApplicationDemo(user.uid, applicationId);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getAdminApplicationDemo>>>(
    `/admin/applications/${encodeURIComponent(applicationId)}`,
    { method: 'GET' },
    token
  );
}

export async function reviewAdminApplication(
  user: AuthUser,
  applicationId: string,
  input: AdminReviewInput
) {
  if (isDemoDataMode) {
    return reviewAdminApplicationDemo(user.uid, applicationId, input);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof reviewAdminApplicationDemo>>>(
    `/admin/applications/${encodeURIComponent(applicationId)}/review`,
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function driverSafetyControl(
  user: AuthUser,
  driverUid: string,
  input: { action: 'DEACTIVATE' | 'RESTORE'; reason: string }
) {
  if (isDemoDataMode) {
    return driverSafetyControlDemo(user.uid, driverUid, input);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof driverSafetyControlDemo>>>(
    `/admin/drivers/${encodeURIComponent(driverUid)}/control`,
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function getAdminReports(user: AuthUser) {
  if (isDemoDataMode) {
    return getAdminReportsDemo(user.uid);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getAdminReportsDemo>>>(
    '/admin/reports',
    { method: 'GET' },
    token
  );
}

export async function resolveAdminReport(
  user: AuthUser,
  reportId: string,
  input: ReportResolutionInput
) {
  if (isDemoDataMode) {
    return resolveReportDemo(user.uid, reportId, input);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof resolveReportDemo>>>(
    `/admin/reports/${encodeURIComponent(reportId)}`,
    { method: 'POST', body: JSON.stringify(input) },
    token
  );
}

export async function listFavouriteDriverIds(user: AuthUser): Promise<string[]> {
  return getCustomerDetailsDemo(user).favouriteDriverIds;
}

export async function setDriverFavourite(
  user: AuthUser,
  driverId: string,
  favourite: boolean
): Promise<string[]> {
  return setDriverFavouriteDemo(user, driverId, favourite).favouriteDriverIds;
}

export async function getAdminCustomers(user: AuthUser): Promise<CustomerAccountRecord[]> {
  if (isDemoDataMode) {
    return getAdminCustomersDemo();
  }

  const token = await user.getIdToken();
  return request<CustomerAccountRecord[]>('/admin/customers', { method: 'GET' }, token);
}

export async function getAdminCustomer(user: AuthUser, customerId: string) {
  if (isDemoDataMode) {
    return getAdminCustomerDemo(customerId);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof getAdminCustomerDemo>>>(
    `/admin/customers/${encodeURIComponent(customerId)}`,
    { method: 'GET' },
    token
  );
}

export async function restoreAdminCustomer(
  user: AuthUser,
  customerId: string,
  reason: string
) {
  if (isDemoDataMode) {
    return restoreAdminCustomerDemo(user.uid, customerId, reason);
  }

  const token = await user.getIdToken();
  return request<Awaited<ReturnType<typeof restoreAdminCustomerDemo>>>(
    `/admin/customers/${encodeURIComponent(customerId)}/restore`,
    { method: 'POST', body: JSON.stringify({ reason }) },
    token
  );
}
