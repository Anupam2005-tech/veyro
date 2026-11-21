const disputeWindowMs = 48 * 60 * 60 * 1000;

export function isCompletedTripDisputeTimely(completedAt: Date, submittedAt: Date): boolean {
  const elapsedMs = submittedAt.getTime() - completedAt.getTime();
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) {
    throw new RangeError('Dispute timing requires valid timestamps in chronological order');
  }
  return elapsedMs <= disputeWindowMs;
}
