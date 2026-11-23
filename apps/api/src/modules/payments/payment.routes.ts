import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import { env } from '../../config/env.js';
import { authenticate, currentUser, requireRole } from '../../middleware/authenticate.js';
import { db, mutate, newId, nowIso } from '../../store/db.js';
import type { Database, Payment } from '../../store/types.js';
import { checkValidation, handle, param } from '../../shared/http/handler.js';
import { sendError, sendSuccess } from '../../shared/http/response.js';
import { BusinessError, ConflictError, NotFoundError } from '../../shared/errors/errors.js';
import { notify } from '../../services/domain.js';
import { verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature } from './razorpay-signature.js';

/**
 * Payments (§5.8). Razorpay Test Mode when keys are configured; otherwise a
 * clearly-labelled DEMO mode so the flow works offline. Either way the amount
 * is computed on the server and the browser callback is never the authority.
 */
function razorpayEnabled(): boolean {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

function razorpayAuth(): string {
  return `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}`;
}

/** Monotonic capture: never moves CAPTURED backwards (§11.5). */
function capture(data: Database, payment: Payment, razorpayPaymentId: string | null): void {
  if (payment.status === 'CAPTURED') return;
  payment.status = 'CAPTURED';
  payment.razorpayPaymentId = razorpayPaymentId ?? payment.razorpayPaymentId;
  payment.verifiedAt = nowIso();
  payment.updatedAt = nowIso();
  for (const id of payment.ledgerEntryIds) {
    const entry = data.ledger.find((e) => e.id === id);
    if (entry && entry.status === 'UNPAID') {
      entry.status = 'PAID';
      entry.paymentId = payment.id;
    }
  }
  notify(data, payment.customerId, 'PAYMENT_CAPTURED', 'Payment received', `₹${payment.amountInr} received. Thank you!`, '/customer/bookings');
}

export function paymentRouter(): Router {
  const router = Router();

  /** POST /payments/webhook — raw body signature check before parsing, deduplicated by event id. */
  router.post('/webhook', (req: Request, res: Response) => {
    const raw = req.body as Buffer;
    if (!Buffer.isBuffer(raw) || !verifyRazorpayWebhookSignature(raw, req.headers['x-razorpay-signature'], env.razorpayWebhookSecret)) {
      return sendError(res, 'Invalid webhook signature.', 'INVALID_SIGNATURE', 400);
    }
    let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      return sendError(res, 'Invalid webhook payload.', 'VALIDATION_ERROR', 400);
    }
    const eventId = String(req.headers['x-razorpay-event-id'] ?? '');
    const result = mutate((data) => {
      if (eventId && data.webhookEvents.includes(eventId)) return 'duplicate';
      if (eventId) data.webhookEvents.push(eventId);
      const entity = event.payload?.payment?.entity;
      const payment = data.payments.find((p) => p.razorpayOrderId && p.razorpayOrderId === entity?.order_id);
      if (!payment) return 'ignored';
      if (event.event === 'payment.captured' || event.event === 'order.paid') capture(data, payment, entity?.id ?? null);
      else if (event.event === 'payment.failed' && payment.status !== 'CAPTURED') {
        payment.status = 'FAILED';
        payment.updatedAt = nowIso();
      }
      return 'processed';
    });
    return sendSuccess(res, { result }, 'Webhook received.');
  });

  router.use(authenticate, requireRole('CUSTOMER'));

  router.get('/', handle((_req, res) => {
    const user = currentUser(res);
    const ledger = db().ledger.filter((e) => e.ownerId === user.id && e.ownerRole === 'CUSTOMER').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const payments = db().payments.filter((p) => p.customerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sendSuccess(res, { ledger, payments, mode: razorpayEnabled() ? 'RAZORPAY_TEST' : 'DEMO' }, 'Payments loaded.');
  }));

  router.post('/orders', body('idempotencyKey').isString().isLength({ min: 8, max: 80 }), checkValidation, handle(async (req, res) => {
    const user = currentUser(res);
    const key = String(req.body.idempotencyKey);
    const existing = db().payments.find((p) => p.customerId === user.id && p.idempotencyKey === key);
    if (existing) return sendSuccess(res, checkoutPayload(existing), 'Payment attempt already created.');

    const entries = db().ledger.filter((e) => e.ownerId === user.id && e.ownerRole === 'CUSTOMER' && e.status === 'UNPAID' && e.disputeStatus !== 'UNDER_REVIEW');
    const amountInr = entries.reduce((s, e) => s + e.amountInr, 0);
    if (amountInr <= 0) throw new BusinessError('You have nothing to pay right now.', 'NOTHING_DUE');

    let razorpayOrderId: string | null = null;
    if (razorpayEnabled()) {
      const r = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: razorpayAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountInr * 100, currency: 'INR', receipt: newId('rcpt').slice(0, 40) }),
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (!r || !r.ok) throw new BusinessError('Could not reach Razorpay. Try again in a moment.', 'PAYMENT_PROVIDER_ERROR');
      razorpayOrderId = ((await r.json()) as { id: string }).id;
    }
    const payment = mutate((data) => {
      const p: Payment = {
        id: newId('pay'), customerId: user.id, ledgerEntryIds: entries.map((e) => e.id), amountInr, currency: 'INR',
        mode: razorpayEnabled() ? 'RAZORPAY_TEST' : 'DEMO', razorpayOrderId, razorpayPaymentId: null, idempotencyKey: key,
        status: 'ORDER_CREATED', verifiedAt: null, createdAt: nowIso(), updatedAt: nowIso(),
      };
      data.payments.push(p);
      return p;
    });
    return sendSuccess(res, checkoutPayload(payment), 'Payment order created.', 201);
  }));

  /** Checkout callback: verify signature, then confirm capture with Razorpay (never trust the browser). */
  router.post(
    '/verify',
    body('paymentId').isString(),
    body('razorpay_order_id').isString(),
    body('razorpay_payment_id').isString(),
    body('razorpay_signature').isString(),
    checkValidation,
    handle(async (req, res) => {
      const user = currentUser(res);
      const payment = db().payments.find((p) => p.id === req.body.paymentId && p.customerId === user.id);
      if (!payment || payment.mode !== 'RAZORPAY_TEST' || !payment.razorpayOrderId) throw new NotFoundError('Payment not found.');
      const valid = verifyRazorpayCheckoutSignature(payment.razorpayOrderId, req.body.razorpay_order_id, req.body.razorpay_payment_id, req.body.razorpay_signature, env.razorpayKeySecret);
      if (!valid) {
        mutate((data) => {
          const p = data.payments.find((x) => x.id === payment.id)!;
          if (p.status !== 'CAPTURED') p.status = 'REVIEW_REQUIRED';
        });
        throw new BusinessError('Payment signature could not be verified.', 'INVALID_SIGNATURE');
      }
      const r = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(req.body.razorpay_payment_id)}`, {
        headers: { Authorization: razorpayAuth() },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      const status = r && r.ok ? ((await r.json()) as { status: string }).status : 'unknown';
      const updated = mutate((data) => {
        const p = data.payments.find((x) => x.id === payment.id)!;
        if (status === 'captured') capture(data, p, req.body.razorpay_payment_id);
        else if (p.status !== 'CAPTURED') {
          p.status = 'PENDING';
          p.razorpayPaymentId = req.body.razorpay_payment_id;
          p.updatedAt = nowIso();
        }
        return p;
      });
      return sendSuccess(res, checkoutPayload(updated), updated.status === 'CAPTURED' ? 'Payment confirmed.' : 'Payment verification pending.');
    }),
  );

  /** DEMO mode only: simulate a successful test capture. */
  router.post('/:id/demo-capture', handle((req, res) => {
    const user = currentUser(res);
    const updated = mutate((data) => {
      const p = data.payments.find((x) => x.id === param(req, 'id') && x.customerId === user.id);
      if (!p) throw new NotFoundError('Payment not found.');
      if (p.mode !== 'DEMO') throw new ConflictError('Demo capture is only available when Razorpay test keys are not configured.');
      capture(data, p, `demo_${p.id}`);
      return p;
    });
    return sendSuccess(res, checkoutPayload(updated), 'Demo payment captured (no real money moved).');
  }));

  return router;
}

function checkoutPayload(p: Payment) {
  return {
    paymentId: p.id,
    status: p.status,
    mode: p.mode,
    amountInr: p.amountInr,
    razorpay: p.mode === 'RAZORPAY_TEST' ? { keyId: env.razorpayKeyId, orderId: p.razorpayOrderId, amountPaise: p.amountInr * 100 } : null,
  };
}
