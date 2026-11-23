import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import { authenticate, currentUser, requireRole, signFileAccess, verifyFileAccess } from '../../middleware/authenticate.js';
import { DATA_DIR, db, mutate, nowIso } from '../../store/db.js';
import { checkValidation, handle, param, str } from '../../shared/http/handler.js';
import { sendError, sendSuccess } from '../../shared/http/response.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/errors.js';
import { audit, notify, outstandingBalance, rating } from '../../services/domain.js';
import { bookingView, locationView } from '../../services/views.js';
import { prepareApplicationReview, prepareCustomerRestore, prepareDriverControl } from './admin-decision-rules.js';

function decision<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    throw new ValidationError((e as Error).message);
  }
}

const reasonRule = body('reason').isString().trim().isLength({ min: 3, max: 500 }).withMessage('A reason is required for the audit log.');

function userName(id: string): string {
  return db().users.find((u) => u.id === id)?.name ?? id;
}

/** Signed short-lived document URL handler (mounted without bearer auth; the signature is the credential). */
export function adminFileRouter(): Router {
  const router = Router();
  router.get('/files', (req: Request, res: Response) => {
    const path = String(req.query.path ?? '');
    const exp = Number(req.query.exp);
    const sig = String(req.query.sig ?? '');
    if (!/^drivers\/[\w-]+\/[\w-]+\.(pdf|png|jpg)$/.test(path) || !verifyFileAccess(path, exp, sig)) {
      return sendError(res, 'This document link has expired.', 'LINK_EXPIRED', 403);
    }
    const file = resolve(DATA_DIR, 'uploads', path.replace(/^drivers\//, ''));
    if (!existsSync(file)) return sendError(res, 'Document not found.', 'NOT_FOUND', 404);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(file);
  });
  return router;
}

export function adminRouter(): Router {
  const router = Router();
  router.use(authenticate, requireRole('ADMIN'));

  router.get('/overview', handle((_req, res) => {
    const d = db();
    return sendSuccess(res, {
      pendingApplications: d.applications.filter((a) => a.status === 'PENDING_REVIEW').length,
      approvedDrivers: d.drivers.filter((x) => x.approvalStatus === 'APPROVED').length,
      rejectedApplications: d.applications.filter((a) => a.status === 'REJECTED').length,
      openReports: d.reports.filter((r) => r.status === 'OPEN' || r.status === 'UNDER_REVIEW').length,
      activeSos: d.sosEvents.filter((s) => s.status === 'ACTIVE').length,
      onlineDrivers: d.drivers.filter((x) => x.isOnline).length,
      activeTrips: d.trips.filter((t) => ['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(t.status)).length,
      suspendedCustomers: d.users.filter((u) => u.role === 'CUSTOMER' && u.status === 'SUSPENDED').length,
    }, 'Overview loaded.');
  }));

  router.get('/applications', handle((req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.toLowerCase() : '';
    const list = db()
      .applications.filter((a) => a.status !== 'DRAFT')
      .filter((a) => !status || a.status === status)
      .filter((a) => !q || a.profile.name.toLowerCase().includes(q) || a.driverId.toLowerCase().includes(q))
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
      .map((a) => ({ id: a.id, driverId: a.driverId, name: a.profile.name, status: a.status, submittedAt: a.submittedAt, serviceArea: a.serviceArea.label, documents: a.documents.length }));
    return sendSuccess(res, list, 'Applications loaded.');
  }));

  router.get('/applications/:id', handle((req, res) => {
    const app = db().applications.find((a) => a.id === param(req, 'id'));
    if (!app) throw new NotFoundError('Application not found.');
    const driver = db().drivers.find((d) => d.id === app.driverId);
    const user = db().users.find((u) => u.id === app.driverId);
    const documents = app.documents.map((doc) => {
      const { exp, sig } = signFileAccess(doc.storagePath);
      const { storagePath, ...rest } = doc;
      return { ...rest, url: `/api/v1/admin-files/files?path=${encodeURIComponent(storagePath)}&exp=${exp}&sig=${encodeURIComponent(sig)}`, urlExpiresAt: new Date(exp).toISOString() };
    });
    const history = db().auditLogs.filter((l) => l.entityId === app.id || l.entityId === app.driverId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sendSuccess(res, {
      ...app,
      documents,
      email: user?.email,
      driver: driver && {
        approvalStatus: driver.approvalStatus, isSuspended: driver.isSuspended, suspensionReason: driver.suspensionReason,
        verifiedNoShowCount: driver.verifiedNoShowCount, rating: rating(driver), ratingCount: driver.ratingCount, isOnline: driver.isOnline,
      },
      history: history.map((h) => ({ ...h, adminName: h.adminId === 'SYSTEM' ? 'System' : userName(h.adminId) })),
    }, 'Application loaded.');
  }));

  router.post(
    '/applications/:id/review',
    body('action').isIn(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
    reasonRule,
    body('changes').optional().isArray(),
    checkValidation,
    handle((req, res) => {
      const admin = currentUser(res);
      const result = mutate((data) => {
        const app = data.applications.find((a) => a.id === param(req, 'id'));
        if (!app) throw new NotFoundError('Application not found.');
        const decided = decision(() => prepareApplicationReview(app.status, req.body.action, req.body.reason, req.body.changes));
        const before = app.status;
        app.status = decided.status;
        app.reviewReason = decided.reviewReason;
        app.requestedChanges = 'changes' in decided && decided.changes ? [...decided.changes] : [];
        app.reviewedBy = admin.id;
        app.reviewedAt = nowIso();
        app.updatedAt = nowIso();
        const driver = data.drivers.find((d) => d.id === app.driverId);
        if (driver) {
          driver.approvalStatus = decided.status;
          if (decided.status !== 'APPROVED') driver.isOnline = false;
        }
        audit(data, admin, { action: `APPLICATION_${req.body.action}`, entityType: 'driverApplication', entityId: app.id, before, after: app.status, reason: decided.reviewReason });
        const messages = {
          APPROVED: ['Application approved', 'You are approved. Go online from your dashboard to receive offers.'],
          REJECTED: ['Application not approved', `Reason: ${decided.reviewReason}`],
          NEEDS_CHANGES: ['Changes requested', `Please update your application: ${app.requestedChanges.join('; ')}`],
        } as const;
        const [title, msg] = messages[decided.status];
        notify(data, app.driverId, 'ACCOUNT_STATUS', title, msg, '/driver/status');
        return app;
      });
      return sendSuccess(res, { id: result.id, status: result.status }, 'Decision recorded.');
    }),
  );

  router.get('/drivers', handle((_req, res) => {
    const list = db().drivers.filter((d) => d.approvalStatus !== 'DRAFT').map((d) => ({
      id: d.id, name: userName(d.id), approvalStatus: d.approvalStatus, isSuspended: d.isSuspended, suspensionReason: d.suspensionReason,
      isOnline: d.isOnline, verifiedNoShowCount: d.verifiedNoShowCount, rating: rating(d), hourlyRateInr: d.hourlyRateInr,
      presence: locationView(d.presence), simulated: d.simulated,
      applicationId: db().applications.find((a) => a.driverId === d.id)?.id ?? null,
    }));
    return sendSuccess(res, list, 'Drivers loaded.');
  }));

  router.post('/drivers/:id/deactivate', reasonRule, checkValidation, handle((req, res) => {
    const admin = currentUser(res);
    const driver = mutate((data) => {
      const d = data.drivers.find((x) => x.id === param(req, 'id'));
      if (!d) throw new NotFoundError('Driver not found.');
      const r = decision(() => prepareDriverControl(d.approvalStatus, 'DEACTIVATE', req.body.reason));
      d.approvalStatus = r.approvalStatus;
      d.isOnline = false;
      const app = data.applications.find((a) => a.driverId === d.id);
      if (app) app.status = 'DEACTIVATED';
      audit(data, admin, { action: 'DRIVER_DEACTIVATED', entityType: 'driver', entityId: d.id, before: 'APPROVED', after: 'DEACTIVATED', reason: r.auditReason });
      notify(data, d.id, 'ACCOUNT_STATUS', 'Account deactivated', `Reason: ${r.auditReason}`, '/driver/status');
      return d;
    });
    return sendSuccess(res, { id: driver.id, approvalStatus: driver.approvalStatus }, 'Driver deactivated.');
  }));

  /** Restores a deactivated driver, or lifts an automatic no-show suspension. */
  router.post('/drivers/:id/restore', reasonRule, checkValidation, handle((req, res) => {
    const admin = currentUser(res);
    const driver = mutate((data) => {
      const d = data.drivers.find((x) => x.id === param(req, 'id'));
      if (!d) throw new NotFoundError('Driver not found.');
      const reason = str(req.body.reason, 500);
      if (d.isSuspended) {
        d.isSuspended = false;
        d.suspendedAt = null;
        d.suspensionReason = null;
        audit(data, admin, { action: 'DRIVER_SUSPENSION_LIFTED', entityType: 'driver', entityId: d.id, before: 'SUSPENDED', after: 'ACTIVE', reason });
      } else {
        const r = decision(() => prepareDriverControl(d.approvalStatus, 'RESTORE', reason));
        d.approvalStatus = r.approvalStatus;
        const app = data.applications.find((a) => a.driverId === d.id);
        if (app) app.status = 'APPROVED';
        audit(data, admin, { action: 'DRIVER_RESTORED', entityType: 'driver', entityId: d.id, before: 'DEACTIVATED', after: 'APPROVED', reason: r.auditReason });
      }
      notify(data, d.id, 'ACCOUNT_STATUS', 'Account restored', 'You can go online again.', '/driver');
      return d;
    });
    return sendSuccess(res, { id: driver.id, approvalStatus: driver.approvalStatus, isSuspended: driver.isSuspended }, 'Driver restored.');
  }));

  router.get('/customers', handle((_req, res) => {
    const list = db().users.filter((u) => u.role === 'CUSTOMER').map((u) => ({
      id: u.id, name: u.name || u.email, email: u.email, status: u.status, customerCancellationCount: u.customerCancellationCount,
      suspensionReason: u.suspensionReason, outstandingBalanceInr: outstandingBalance(u.id),
    }));
    return sendSuccess(res, list, 'Customers loaded.');
  }));

  router.get('/customers/:id', handle((req, res) => {
    const admin = currentUser(res);
    const u = db().users.find((x) => x.id === param(req, 'id') && x.role === 'CUSTOMER');
    if (!u) throw new NotFoundError('Customer not found.');
    const cancellations = db().bookings.filter((b) => b.customerId === u.id && b.cancellation?.by === 'CUSTOMER').map((b) => bookingView(b, admin));
    return sendSuccess(res, {
      id: u.id, name: u.name, email: u.email, phone: u.phone, status: u.status, suspendedAt: u.suspendedAt, suspensionReason: u.suspensionReason,
      customerCancellationCount: u.customerCancellationCount, outstandingBalanceInr: outstandingBalance(u.id), cancellations,
      history: db().auditLogs.filter((l) => l.entityId === u.id),
    }, 'Customer loaded.');
  }));

  router.post('/customers/:id/restore', reasonRule, checkValidation, handle((req, res) => {
    const admin = currentUser(res);
    const u = mutate((data) => {
      const c = data.users.find((x) => x.id === param(req, 'id') && x.role === 'CUSTOMER');
      if (!c) throw new NotFoundError('Customer not found.');
      const r = decision(() => prepareCustomerRestore(c.status, req.body.reason));
      c.status = r.status;
      c.suspendedAt = null;
      c.suspensionReason = null;
      audit(data, admin, { action: 'CUSTOMER_RESTORED', entityType: 'customer', entityId: c.id, before: 'SUSPENDED', after: 'ACTIVE', reason: r.auditReason });
      notify(data, c.id, 'ACCOUNT_STATUS', 'Account restored', 'Your account is active again.', '/customer');
      return c;
    });
    return sendSuccess(res, { id: u.id, status: u.status }, 'Customer restored.');
  }));

  router.get('/reports', handle((_req, res) => {
    const list = db().reports.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => ({
      ...r, reporterName: userName(r.reporterId), reportedName: userName(r.reportedUserId),
    }));
    return sendSuccess(res, list, 'Reports loaded.');
  }));

  router.post(
    '/reports/:id/status',
    body('status').isIn(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
    body('note').if(body('status').isIn(['RESOLVED', 'DISMISSED'])).isString().trim().isLength({ min: 3, max: 1000 }).withMessage('A resolution note is required.'),
    body('disputeOutcome').optional().isIn(['UPHELD', 'REJECTED']),
    checkValidation,
    handle((req, res) => {
      const admin = currentUser(res);
      const report = mutate((data) => {
        const r = data.reports.find((x) => x.id === param(req, 'id'));
        if (!r) throw new NotFoundError('Report not found.');
        if (r.status === 'RESOLVED' || r.status === 'DISMISSED') throw new ConflictError('This report is already closed.');
        const before = r.status;
        r.status = req.body.status;
        const note = str(req.body.note, 1000) || 'Moved to review';
        if (r.status !== 'UNDER_REVIEW') {
          r.resolutionNote = note;
          r.resolvedBy = admin.id;
          r.resolvedAt = nowIso();
          // Close any linked ledger dispute: upheld waives the charge, rejected makes it payable again.
          const entry = r.linkedLedgerEntryId ? data.ledger.find((e) => e.id === r.linkedLedgerEntryId) : undefined;
          if (entry && entry.disputeStatus === 'UNDER_REVIEW') {
            const upheld = req.body.disputeOutcome === 'UPHELD';
            entry.disputeStatus = upheld ? 'UPHELD' : 'REJECTED';
            if (upheld) entry.status = 'WAIVED';
          }
          // Only the reporter is notified (§5.13).
          notify(data, r.reporterId, 'REPORT_RESOLVED', `Report ${r.status.toLowerCase()}`, note);
        }
        audit(data, admin, { action: `REPORT_${r.status}`, entityType: 'report', entityId: r.id, before, after: r.status, reason: note });
        return r;
      });
      return sendSuccess(res, { id: report.id, status: report.status }, 'Report updated.');
    }),
  );

  router.get('/sos', handle((_req, res) => {
    const list = db().sosEvents.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((s) => ({ ...s, customerName: userName(s.customerId), raisedByName: userName(s.raisedBy) }));
    return sendSuccess(res, list, 'SOS events loaded.');
  }));

  router.get('/audit', handle((_req, res) => {
    const list = db().auditLogs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200).map((l) => ({ ...l, adminName: l.adminId === 'SYSTEM' ? 'System' : userName(l.adminId) }));
    return sendSuccess(res, list, 'Audit log loaded.');
  }));

  return router;
}
