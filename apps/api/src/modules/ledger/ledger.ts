import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { documentId } from '../quotes/quote-repository.js';
import { appendAdminAudit } from '../audit/audit.service.js';
import { activeRoles } from '../auth/profile.js';
import { isCompletedTripDisputeTimely } from '../payments/completed-trip-dispute-window.js';

export interface Charge {
  customerId: string; driverId: string; amountPaise: number; source: string;
}
export function writeCharge(db: Firestore, tx: Transaction, id: string, charge: Charge) {
  if (!Number.isSafeInteger(charge.amountPaise) || charge.amountPaise < 0) throw new Error('Invalid charge amount');
  const ref = db.collection('payables').doc(documentId(id));
  tx.create(ref, { ...charge, currency: 'INR', status: charge.amountPaise ? 'CONFIRMED' : 'SETTLED_ZERO',
    isUnderActiveDispute: false, createdAt: new Date() });
  tx.create(db.collection('driverEarnings').doc(id), {
    ...charge, commissionPaise: 0, netPaise: charge.source === 'COMPLETED_TRIP' ? charge.amountPaise : null,
    status: charge.source === 'COMPLETED_TRIP' ? 'ACCRUED' : 'ALLOCATION_PENDING', createdAt: new Date(),
  });
  tx.set(db.collection('users').doc(charge.customerId), { balanceUpdatedAt: new Date() }, { merge: true });
}

export class LedgerService {
  constructor(private readonly db: Firestore) {}

  dispute(uid: string, id: string, reportId: string) {
    const ref = this.db.collection('payables').doc(documentId(id));
    return this.db.runTransaction(async tx => {
      const invoice = await tx.get(ref);
      const trip = await tx.get(this.db.collection('trips').doc(id));
      const report = await tx.get(this.db.collection('reports').doc(documentId(reportId)));
      await tx.get(this.db.collection('users').doc(uid));
      if (!invoice.exists || invoice.get('customerId') !== uid || report.get('reporterId') !== uid ||
          report.get('tripId') !== id) throw new AppError(404, 'DISPUTE_NOT_ACCESSIBLE', 'Dispute evidence unavailable.');
      if (invoice.get('linkedReportId') === reportId && invoice.get('isUnderActiveDispute') === true) return;
      if (invoice.get('isUnderActiveDispute') === true) throw new AppError(409, 'DISPUTE_EXISTS', 'An active dispute already exists.');
      if (trip.get('status') !== 'COMPLETED') throw new AppError(409, 'DISPUTE_POLICY_PENDING', 'This charge requires a defined dispute policy.');
      if (!isCompletedTripDisputeTimely(new Date(trip.get('endedAt')), new Date())) {
        throw new AppError(409, 'DISPUTE_WINDOW_CLOSED', 'The completed-trip dispute window has closed.');
      }
      tx.update(ref, { isUnderActiveDispute: true, linkedReportId: reportId, disputeOpenedAt: new Date() });
      tx.set(this.db.collection('users').doc(uid), { balanceUpdatedAt: new Date() }, { merge: true });
    });
  }

  adjust(adminId: string, id: string, adjustmentId: string, deltaPaise: number, reason: string) {
    if (!Number.isSafeInteger(deltaPaise) || !deltaPaise || !reason.trim()) {
      throw new AppError(400, 'INVALID_ADJUSTMENT', 'A nonzero integer adjustment and reason are required.');
    }
    const ref = this.db.collection('payables').doc(documentId(id));
    const change = this.db.collection('ledgerEntries').doc('adjust-' + documentId(adjustmentId));
    return this.db.runTransaction(async tx => {
      const admin = await tx.get(this.db.collection('users').doc(adminId));
      const roles = activeRoles(admin.data());
      if (!roles.includes('ADMIN')) throw new AppError(403, 'ROLE_FORBIDDEN', 'Active Admin required.');
      const invoice = await tx.get(ref);
      const previous = await tx.get(change);
      const lock = await tx.get(ref.collection('locks').doc('activeAttempt'));
      const earnings = this.db.collection('driverEarnings').doc(id);
      const earning = await tx.get(earnings);
      if (previous.exists) {
        if (previous.get('invoiceId') !== id || previous.get('deltaPaise') !== deltaPaise ||
            previous.get('adminId') !== adminId || previous.get('reason') !== reason) {
          throw new AppError(409, 'ADJUSTMENT_CONFLICT', 'Adjustment id was already used.');
        }
        return;
      }
      if (!invoice.exists || invoice.get('status') !== 'CONFIRMED' || lock.exists) {
        throw new AppError(409, 'ADJUSTMENT_UNAVAILABLE', 'Only unpaid invoices without an active provider order can be adjusted.');
      }
      const amount = invoice.get('amountPaise') + deltaPaise;
      if (!Number.isSafeInteger(amount) || amount < 0) throw new AppError(422, 'INVALID_ADJUSTMENT', 'Adjustment produces an invalid balance.');
      if (amount > 0 && amount < 100) {
        throw new AppError(422, 'INVALID_ADJUSTMENT', 'A payable balance must be zero or at least ₹1.');
      }
      await tx.get(this.db.collection('users').doc(invoice.get('customerId')));
      tx.create(change, { invoiceId: id, customerId: invoice.get('customerId'), adminId,
        kind: 'ADJUSTMENT', deltaPaise, reason, createdAt: new Date() });
      tx.update(ref, { amountPaise: amount, status: amount ? 'CONFIRMED' : 'SETTLED_ZERO' });
      if (earning.exists) tx.update(earnings, { amountPaise: amount,
        netPaise: earning.get('netPaise') === null ? null : amount });
      tx.set(this.db.collection('users').doc(invoice.get('customerId')), { balanceUpdatedAt: new Date() }, { merge: true });
      appendAdminAudit(this.db, tx, { uid: adminId, roles }, 'adjust-' + adjustmentId, {
        action: 'ADJUST_PAYABLE', entityType: 'PAYABLE', entityId: id,
        before: String(invoice.get('amountPaise')), after: String(amount), reason,
      });
    });
  }

  // Resolution records an authorized decision. Financial adjustments are separate entries.
  resolve(adminId: string, id: string, note: string) {
    const ref = this.db.collection('payables').doc(documentId(id));
    if (!note.trim()) throw new AppError(400, 'REASON_REQUIRED', 'A reason is required.');
    return this.db.runTransaction(async tx => {
      const invoice = await tx.get(ref);
      const admin = await tx.get(this.db.collection('users').doc(adminId));
      const roles = activeRoles(admin.data());
      if (!roles.includes('ADMIN')) throw new AppError(403, 'ROLE_FORBIDDEN', 'Admin role required.');
      if (invoice.exists && invoice.get('isUnderActiveDispute') === false && invoice.get('disputeResolution') === note) return;
      if (!invoice.exists || !invoice.get('isUnderActiveDispute')) throw new AppError(409, 'NO_ACTIVE_DISPUTE', 'No active dispute.');
      await tx.get(this.db.collection('users').doc(invoice.get('customerId')));
      tx.update(ref, { isUnderActiveDispute: false, disputeResolution: note });
      tx.set(this.db.collection('users').doc(invoice.get('customerId')), { balanceUpdatedAt: new Date() }, { merge: true });
      appendAdminAudit(this.db, tx, { uid: adminId, roles }, 'dispute-' + id + '-' + invoice.get('linkedReportId'), {
        action: 'RESOLVE_DISPUTE', entityType: 'PAYABLE', entityId: id, before: 'DISPUTED', after: invoice.get('status'), reason: note,
      });
    });
  }
}
