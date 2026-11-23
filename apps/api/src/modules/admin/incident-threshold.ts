export function hasReachedSuspensionThreshold(qualifyingIncidentIds: readonly string[]): boolean {
  return new Set(qualifyingIncidentIds.filter((id) => id.trim())).size >= 5;
}
