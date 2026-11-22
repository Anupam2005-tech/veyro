import { Router, type Request, type Response } from 'express';
import { sendError, sendSuccess } from '../../shared/http/response.js';
import { prepareApplicationReview, prepareCustomerRestore, prepareDriverControl } from './admin-decision-rules.js';
import { appendAdminAudit } from '../audit/audit.service.js';

function adminActor(res: Response) {
  return (res.locals as { verifiedUid?: string }).verifiedUid
    ? { uid: (res.locals as { verifiedUid: string }).verifiedUid, roles: ['ADMIN'] as const }
    : null;
}

/** Admin review endpoints — TODO(BE-001/BE-002): authenticate + requireRole(ADMIN). */
export function adminRouter(): Router {
  const router = Router();

  router.post('/applications/:id/review', (req: Request, res: Response) => {
    const actor = adminActor(res);
    if (!actor) return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
    try {
      const result = prepareApplicationReview(
        (req.body as { currentStatus?: string })?.currentStatus ?? '',
        (req.body as { action?: unknown })?.action,
        (req.body as { reason?: unknown })?.reason,
        (req.body as { changes?: unknown[] })?.changes,
      );
      return sendSuccess(res, result, 'Application reviewed.');
    } catch (err) {
      return sendError(res, err instanceof Error ? err.message : 'Review failed.', 'VALIDATION_ERROR', 400);
    }
  });

  router.post('/drivers/:id/deactivate', (req: Request, res: Response) => {
    const actor = adminActor(res);
    if (!actor) return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
    try {
      const result = prepareDriverControl(
        (req.body as { currentStatus?: string })?.currentStatus ?? '',
        'DEACTIVATE',
        (req.body as { reason?: unknown })?.reason,
      );
      return sendSuccess(res, result, 'Driver deactivated.');
    } catch (err) {
      return sendError(res, err instanceof Error ? err.message : 'Action failed.', 'VALIDATION_ERROR', 400);
    }
  });

  router.get('/audit/ping', (_req: Request, res: Response) => {
    void appendAdminAudit;
    return sendSuccess(res, { ok: true }, 'Audit module loaded.');
  });

  router.post('/customers/:id/restore', (req: Request, res: Response) => {
    const actor = adminActor(res);
    if (!actor) return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
    try {
      const result = prepareCustomerRestore(
        (req.body as { currentStatus?: string })?.currentStatus ?? '',
        (req.body as { reason?: unknown })?.reason,
      );
      return sendSuccess(res, result, 'Customer restored.');
    } catch (err) {
      return sendError(res, err instanceof Error ? err.message : 'Restore failed.', 'VALIDATION_ERROR', 400);
    }
  });

  return router;
}
