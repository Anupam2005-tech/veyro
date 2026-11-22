export interface RtdbNode {
  readonly path: string;
  readonly tripId: string;
  /** Null when the trip has no authoritative end state yet. */
  readonly tripEnded: boolean;
  readonly lastUpdatedAt: Date | null;
}

/**
 * Selects ephemeral RTDB nodes eligible for pruning.
 * Removes: ended trips, or nodes with no valid sample older than 2x stale cutoff.
 * Never touches durable Firestore state.
 */
export function selectStaleRtdbNodes(
  nodes: readonly RtdbNode[],
  now: Date = new Date(),
  maxAgeMs: number = 60_000,
): string[] {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || Number.isNaN(nowMs)) {
    throw new RangeError('Reference time must be a valid date');
  }
  const due: string[] = [];
  for (const node of nodes) {
    if (!node.path || !node.path.trim()) {
      continue;
    }
    if (node.tripEnded) {
      due.push(node.path);
      continue;
    }
    if (!(node.lastUpdatedAt instanceof Date)) {
      due.push(node.path);
      continue;
    }
    if (nowMs - node.lastUpdatedAt.getTime() > maxAgeMs) {
      due.push(node.path);
    }
  }
  return due;
}
