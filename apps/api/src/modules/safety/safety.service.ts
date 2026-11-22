export interface SafetyReport {
  readonly id: string;
  readonly reporterUid: string;
  readonly tripId: string;
  readonly category: string;
  readonly details: string;
  readonly status: 'OPEN' | 'RESOLVED';
}

/** Reporter identity is concealed from the subject; resolution needs a note. */
export function submitReport(id: string, reporterUid: string, tripId: string, category: string, details: string): SafetyReport {
  if (!id.trim() || !reporterUid.trim() || !tripId.trim()) throw new RangeError('Report id, reporter and trip are required');
  if (!category.trim()) throw new RangeError('Category is required');
  return { id: id.trim(), reporterUid: reporterUid.trim(), tripId: tripId.trim(), category: category.trim(), details: details.trim(), status: 'OPEN' };
}

export function resolveReport(report: SafetyReport, note: string): SafetyReport {
  if (report.status !== 'OPEN') throw new Error('Only open reports can be resolved');
  if (!note.trim()) throw new Error('Resolution note is required');
  return { ...report, status: 'RESOLVED' };
}

/** DEC-05: 5th qualifying incident suspends the account. */
export function shouldSuspend(qualifyingCount: number): boolean {
  return qualifyingCount >= 5;
}

export interface SosEvent {
  readonly id: string;
  readonly tripId: string;
  readonly createdAt: Date;
}

/** DEC-09: Demo SOS records the event; no external dispatch in Release 1. */
export function recordDemoSos(id: string, tripId: string, now = new Date()): SosEvent {
  if (!id.trim() || !tripId.trim()) throw new RangeError('SOS id and trip are required');
  return { id: id.trim(), tripId: tripId.trim(), createdAt: new Date(now.getTime()) };
}
