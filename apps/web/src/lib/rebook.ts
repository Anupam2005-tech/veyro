import type { Place } from './types';

/** Hand-off from a booking's recovery actions back to the booking studio. */
export const REBOOK_KEY = 'veyro.rebook';

export interface RebookDraft {
  pickup: Place;
  destination: Place;
  stops: Place[];
  vehicleId: string;
  type?: 'INSTANT' | 'SCHEDULED';
}

export function saveRebook(draft: RebookDraft): void {
  try {
    sessionStorage.setItem(REBOOK_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable */
  }
}
