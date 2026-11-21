interface ReportActor {
  uid: string;
  roles: readonly string[];
}

function isAdmin(actor: ReportActor | null): boolean {
  return Boolean(actor?.uid && Array.isArray(actor.roles) && actor.roles.includes('ADMIN'));
}

export function canReadReport(actor: ReportActor | null, reporterId: string): boolean {
  return Boolean(actor?.uid && (actor.uid === reporterId || isAdmin(actor)));
}

export function prepareReportResolution(actor: ReportActor | null, reporterId: string, note: unknown) {
  if (!isAdmin(actor)) {
    throw new Error('Verified Admin authorization is required');
  }
  if (!reporterId.trim() || typeof note !== 'string' || !note.trim()) {
    throw new Error('A stored reporter and resolution note are required');
  }
  return { resolutionNote: note.trim(), notifyUserId: reporterId };
}
