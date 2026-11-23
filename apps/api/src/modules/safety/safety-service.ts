import { reportCategories } from '../../config/approved-policies.js';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { activeRoles } from '../auth/profile.js';
import { appendAdminAudit } from '../audit/audit.service.js';
import { documentId } from '../quotes/quote-repository.js';
import { enqueueNotification } from '../notifications/notifications.js';

async function participant(db: Firestore, tx: Transaction, tripId: string, uid: string) {
  const trip = await tx.get(db.collection('trips').doc(documentId(tripId)));
  if (!trip.exists || (trip.get('customerId') !== uid && trip.get('driverId') !== uid)) {
    throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip is unavailable.');
  }
  return trip;
}

export class SafetyService {
  constructor(private readonly db: Firestore) {}

  report(uid: string, id: string, tripId: string, category: string, description: string) {
    if (!category.trim() || category.length > 80 || !description.trim() || description.length > 2000) {
      throw new AppError(400, 'INVALID_REPORT', 'Provide a report category and description.');
    }
    const ref = this.db.collection('reports').doc(documentId(id));
    return this.db.runTransaction(async tx => {
      const trip = await participant(this.db, tx, tripId, uid);
      const previous = await tx.get(ref);
      const policy = await tx.get(this.db.collection('safetyPolicies').doc('reports'));
      const categories: unknown = policy.exists ? policy.get('categories') : reportCategories;
      if (!Array.isArray(categories) || !categories.includes(category)) {
        throw new AppError(422, 'REPORT_CATEGORY_UNAVAILABLE', 'Choose an approved report category.');
      }
      if (previous.exists) {
        if (previous.get('reporterId') !== uid || previous.get('tripId') !== tripId ||
            previous.get('category') !== category || previous.get('description') !== description) {
          throw new AppError(409, 'REPORT_CONFLICT', 'Report request conflicts with an earlier request.');
        }
        return ref.id;
      }
      tx.create(ref, { reporterId: uid, reporterRole: trip.get('customerId') === uid ? 'CUSTOMER' : 'DRIVER',
        tripId, category, description, status: 'OPEN', createdAt: new Date() });
      return ref.id;
    });
  }

  resolveReport(adminId: string, id: string, status: 'RESOLVED' | 'DISMISSED' | 'UNDER_REVIEW', note: string) {
    if (!['RESOLVED', 'DISMISSED', 'UNDER_REVIEW'].includes(status) || !note.trim() || note.length > 2000) {
      throw new AppError(400, 'INVALID_RESOLUTION', 'A resolution note is required.');
    }
    const ref = this.db.collection('reports').doc(documentId(id));
    return this.db.runTransaction(async tx => {
      const admin = await tx.get(this.db.collection('users').doc(documentId(adminId)));
      const report = await tx.get(ref);
      const roles = activeRoles(admin.data());
      if (!roles.includes('ADMIN')) throw new AppError(403, 'ROLE_FORBIDDEN', 'Admin role required.');
      if (!report.exists) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report unavailable.');
      if (report.get('status') === status && report.get('resolutionNote') === note) return;
      if (!['OPEN', 'UNDER_REVIEW'].includes(report.get('status'))) throw new AppError(409, 'REPORT_CLOSED', 'Report already closed.');
      tx.update(ref, { status, resolutionNote: note, resolvedAt: new Date() });
      const eventId = status === 'UNDER_REVIEW' ? 'report-review-' + id : 'report-' + id;
      appendAdminAudit(this.db, tx, { uid: adminId, roles }, eventId, {
        action: status, entityType: 'REPORT', entityId: id, before: report.get('status'), after: status, reason: note,
      });
      enqueueNotification(this.db, tx, report.get('reporterId'), eventId,
        status === 'UNDER_REVIEW' ? 'REPORT_UNDER_REVIEW' : 'REPORT_RESOLVED', id,
        report.get('reporterRole') === 'DRIVER' ? 'DRIVER' : 'CUSTOMER');
    });
  }

  sos(uid: string, id: string, tripId: string) {
    const ref = this.db.collection('sosEvents').doc(documentId(id));
    return this.db.runTransaction(async tx => {
      const trip = await participant(this.db, tx, tripId, uid);
      const previous = await tx.get(ref);
      if (previous.exists) {
        if (previous.get('actorId') !== uid || previous.get('tripId') !== tripId) throw new AppError(409, 'SOS_CONFLICT', 'SOS request conflicts.');
        return ref.id;
      }
      if (!['IN_PROGRESS', 'ARRIVED', 'DRIVER_EN_ROUTE'].includes(trip.get('status'))) {
        throw new AppError(409, 'TRIP_INACTIVE', 'SOS requires an active trip.');
      }
      tx.create(ref, { actorId: uid, tripId, mode: 'DEMO', deliveryStatus: 'SIMULATED',
        message: 'Demo SOS — no external message sent.', createdAt: new Date() });
      return ref.id;
    });
  }

  cancelSos(uid: string, id: string) {
    const ref = this.db.collection('sosEvents').doc(documentId(id));
    return this.db.runTransaction(async tx => {
      const record = await tx.get(ref);
      if (!record.exists || record.get('actorId') !== uid) {
        throw new AppError(404, 'SOS_NOT_ACCESSIBLE', 'SOS event unavailable.');
      }
      if (record.get('cancelled') === true) return;
      tx.update(ref, { cancelled: true, cancelledAt: new Date() });
      tx.create(this.db.collection('safetyAuditLogs').doc('sos-cancel-' + id), {
        actor: uid, action: 'CANCEL_SOS', eventId: id, at: new Date(), mode: 'DEMO',
      });
    });
  }

  // Called by trusted cancellation/no-show processors after evidence has been verified.
  // The incident document is immutable, unique per source fact and created server-side.
  applyIncident(id: string) {
    const incidentRef = this.db.collection('verifiedIncidents').doc(documentId(id));
    return this.db.runTransaction(async tx => {
      const incident = await tx.get(incidentRef);
      if (!incident.exists || incident.get('verified') !== true || incident.get('qualifies') !== true) {
        throw new AppError(409, 'INCIDENT_UNVERIFIED', 'Verified qualifying evidence is required.');
      }
      if (incident.get('processed') === true) return;
      const kind = incident.get('kind');
      if (kind !== 'CUSTOMER_CANCELLATION' && kind !== 'DRIVER_NO_SHOW') throw new AppError(409, 'INCIDENT_UNVERIFIED', 'Unsupported incident.');
      const uid = documentId(incident.get('uid'));
      const ref = this.db.collection('users').doc(uid);
      const user = await tx.get(ref);
      if (!user.exists) throw new AppError(404, 'PROFILE_UNAVAILABLE', 'Profile unavailable.');
      const field = kind === 'CUSTOMER_CANCELLATION' ? 'customerCancellationCount' : 'verifiedNoShowCount';
      const current = user.get(field) ?? 0;
      if (!Number.isSafeInteger(current) || current < 0) throw new Error('Invalid incident counter');
      const count = current + 1;
      const suspend = count >= 5 && user.get('status') === 'ACTIVE';
      tx.update(incidentRef, { processed: true, processedAt: new Date() });
      tx.update(ref, { [field]: count, ...(suspend ? { status: 'SUSPENDED', suspensionReason: kind,
        suspendedAt: new Date() } : {}) });
      if (suspend) {
        tx.create(this.db.collection('safetyAuditLogs').doc('suspend-' + id), {
          actor: 'SYSTEM', uid, action: 'SUSPEND', incidentId: id, before: 'ACTIVE', after: 'SUSPENDED', at: new Date(),
        });
        enqueueNotification(this.db, tx, uid, 'suspend-' + id, 'ACCOUNT_SUSPENDED', id, kind === 'DRIVER_NO_SHOW' ? 'DRIVER' : 'CUSTOMER');
      }
    });
  }
}
