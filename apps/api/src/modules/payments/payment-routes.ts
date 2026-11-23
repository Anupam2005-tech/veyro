import express, { Router, type RequestHandler } from 'express';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { PaymentService } from './payment-service.js';
import { razorpayConfig, razorpayProvider } from './razorpay-provider.js';
import { verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature } from './razorpay-signature.js';
import { documentId } from '../quotes/quote-repository.js';

function service() { return new PaymentService(getFirestore(getFirebaseAdminApp()), razorpayProvider()); }
function text(value: unknown) {
  if (typeof value !== 'string' || !value || value.length > 200 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new AppError(400, 'INVALID_PAYMENT', 'Invalid payment identifier.');
  return value;
}

export const razorpayWebhook: RequestHandler = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
    if (!secret) throw new AppError(503, 'PAYMENTS_UNAVAILABLE', 'Payment verification unavailable.');
    if (!verifyRazorpayWebhookSignature(req.body, req.get('X-Razorpay-Signature'), secret)) {
      throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Invalid webhook signature.');
    }
    let payload;
    try { payload = JSON.parse(req.body.toString('utf8')); }
    catch { throw new AppError(400, 'INVALID_WEBHOOK', 'Invalid webhook body.'); }
    if (!payload || typeof payload !== 'object') throw new AppError(400, 'INVALID_WEBHOOK', 'Invalid webhook body.');
    if (!['payment.authorized', 'payment.captured', 'order.paid', 'payment.failed'].includes(payload.event)) {
      sendSuccess(res, { received: true }); return;
    }
    const id = text(payload.payload?.payment?.entity?.id);
    const eventId = text(req.get('X-Razorpay-Event-Id'));
    const payment = await razorpayProvider().fetchPayment(id);
    if (payment.id !== id || payment.order_id !== payload.payload?.payment?.entity?.order_id) {
      throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment verification mismatch.');
    }
    if ((payload.event === 'payment.captured' || payload.event === 'order.paid') && payment.status !== 'captured') {
      throw new AppError(503, 'PAYMENT_PENDING', 'Capture confirmation is not available yet.');
    }
    if (payment.status === 'captured' || payment.status === 'failed') {
      await service().settle(payment, eventId + '-' + payment.status);
    }
    sendSuccess(res, { received: true });
  } catch (error) { next(error); }
};

export function createPaymentRouter(): Router {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.use(express.json());
  router.post('/orders', async (req, res, next) => {
    try {
      const uid = req.auth!.uid;
      const result = await service().order(uid, documentId(text(req.body?.invoiceId)), text(req.get('Idempotency-Key')));
      sendSuccess(res, { ...result, keyId: razorpayConfig().keyId }, 'Payment order ready.');
    } catch (error) { next(error); }
  });
  router.post('/reconcile', async (req, res, next) => {
    try {
      const result = await service().reconcile(req.auth!.uid, text(req.body?.invoiceId), text(req.get('Idempotency-Key')));
      sendSuccess(res, result, 'Order reconciled.');
    } catch (error) { next(error); }
  });
  router.post('/status', async (req, res, next) => {
    try {
      const status = await service().status(req.auth!.uid, text(req.body?.invoiceId));
      sendSuccess(res, { status });
    } catch (error) { next(error); }
  });
  router.post('/verify', async (req, res, next) => {
    try {
      const attemptId = documentId(text(req.body?.attemptId));
      const attempt = await getFirestore(getFirebaseAdminApp()).collection('paymentAttempts').doc(attemptId).get();
      if (!attempt.exists || attempt.get('customerId') !== req.auth!.uid) {
        throw new AppError(404, 'PAYMENT_NOT_ACCESSIBLE', 'Payment unavailable.');
      }
      const orderId = text(req.body?.razorpay_order_id);
      const paymentId = text(req.body?.razorpay_payment_id);
      if (!verifyRazorpayCheckoutSignature(attempt.get('orderId'), orderId, paymentId,
        req.body?.razorpay_signature, razorpayConfig().secret)) {
        throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'Invalid payment signature.');
      }
      const payment = await razorpayProvider().fetchPayment(paymentId);
      if (payment.id !== paymentId || payment.order_id !== attempt.get('orderId')) {
        throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment verification mismatch.');
      }
      if (payment.amount !== attempt.get('amountPaise') || payment.currency !== attempt.get('currency')) {
        throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment verification mismatch.');
      }
      if (payment.status === 'captured' || payment.status === 'failed') {
        await service().settle(payment, 'checkout-' + payment.status + '-' + paymentId);
      }
      const status = { captured: 'CAPTURED', failed: 'FAILED', refunded: 'REVIEW_REQUIRED' }[payment.status] ?? 'PENDING';
      sendSuccess(res, { status });
    } catch (error) { next(error); }
  });
  return router;
}
