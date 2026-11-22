import express, { Router, type RequestHandler } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '../../config/firebase-admin.js';
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
    if (payload.event !== 'payment.captured' && payload.event !== 'order.paid' && payload.event !== 'payment.failed') {
      sendSuccess(res, { received: true }); return;
    }
    const id = text(payload.payload?.payment?.entity?.id);
    const eventId = text(req.get('X-Razorpay-Event-Id'));
    const payment = await razorpayProvider().fetchPayment(id);
    if (payment.id !== id) throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment verification mismatch.');
    await service().settle(payment, eventId);
    sendSuccess(res, { received: true });
  } catch (error) { next(error); }
};

export function createPaymentRouter(): Router {
  const router = Router();
  router.use(express.json());
  router.post('/orders', async (req, res, next) => {
    try {
      const uid = req.auth!.uid;
      const result = await service().order(uid, documentId(text(req.body?.invoiceId)), text(req.get('Idempotency-Key')));
      sendSuccess(res, { ...result, keyId: razorpayConfig().keyId }, 'Payment order ready.');
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
      if (payment.status !== 'captured') { sendSuccess(res, { status: 'PENDING' }); return; }
      await service().settle(payment, 'checkout-' + paymentId);
      sendSuccess(res, { status: 'CAPTURED' });
    } catch (error) { next(error); }
  });
  return router;
}
