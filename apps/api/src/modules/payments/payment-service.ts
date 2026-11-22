import { createHash, randomUUID } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { documentId } from '../quotes/quote-repository.js';
import { hasBookingBlockingBalance } from './booking-balance-policy.js';
import { type OrderProvider, type ProviderPayment } from './razorpay-provider.js';

interface Invoice {
  customerId: string; amountPaise: number; currency: 'INR';
  status: 'CONFIRMED' | 'CAPTURED'; isUnderActiveDispute: boolean;
}
export async function enforceBookingBalance(db: Firestore, tx: Transaction, uid: string) {
  // Read the customer document as a serialization point shared with financial writers.
  await tx.get(db.collection('users').doc(documentId(uid)));
  const invoices = await tx.get(db.collection('payables').where('customerId', '==', uid));
  if (hasBookingBlockingBalance(invoices.docs.map(d => ({
    confirmedUnpaidAmount: d.get('status') === 'CONFIRMED' ? d.get('amountPaise') : 0,
    isUnderActiveDispute: d.get('isUnderActiveDispute') === true,
  })))) throw new AppError(409, 'OUTSTANDING_BALANCE', 'Settle the outstanding balance before booking.');
}

export class PaymentService {
  constructor(private readonly db: Firestore, private readonly provider: OrderProvider) {}

  async order(uid: string, invoiceId: string, key: string) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(key)) throw new AppError(400, 'INVALID_IDEMPOTENCY_KEY', 'Provide a valid idempotency key.');
    const invoiceRef = this.db.collection('payables').doc(documentId(invoiceId));
    const attemptId = createHash('sha256').update(uid + '\0' + invoiceId + '\0' + key).digest('hex');
    const ref = this.db.collection('paymentAttempts').doc(attemptId);
    const claim = randomUUID();
    const state = await this.db.runTransaction(async tx => {
      const invoice = (await tx.get(invoiceRef)).data() as Invoice | undefined;
      const attempt = await tx.get(ref);
      if (!invoice || invoice.customerId !== uid) throw new AppError(404, 'PAYMENT_NOT_ACCESSIBLE', 'Payment is unavailable.');
      if (invoice.status !== 'CONFIRMED' || invoice.isUnderActiveDispute ||
          invoice.currency !== 'INR' || !Number.isSafeInteger(invoice.amountPaise) || invoice.amountPaise < 100) {
        throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This invoice cannot be paid.');
      }
      const locked = await tx.get(invoiceRef.collection('locks').doc('activeAttempt'));
      if (locked.exists && locked.get('attemptId') !== attemptId) throw new AppError(409, 'PAYMENT_IN_PROGRESS', 'A payment attempt already exists.');
      if (attempt.get('state') === 'FAILED') throw new AppError(409, 'PAYMENT_ATTEMPT_FAILED', 'Retry with a new idempotency key.');
      if (attempt.exists) return { fresh: false, ...attempt.data() } as { fresh: boolean; amountPaise: number; orderId?: string };
      tx.create(ref, { invoiceId, customerId: uid, amountPaise: invoice.amountPaise, currency: 'INR', state: 'CREATING', claim });
      tx.set(invoiceRef.collection('locks').doc('activeAttempt'), { attemptId });
      return { fresh: true, amountPaise: invoice.amountPaise, orderId: undefined };
    });
    if (!state.fresh) {
      if (state.orderId) return { attemptId, orderId: state.orderId, amountPaise: state.amountPaise, currency: 'INR' };
      throw new AppError(409, 'PAYMENT_RECONCILIATION_REQUIRED', 'The previous order creation is awaiting reconciliation.');
    }
    // Order creation is an external side effect. Never repeat it automatically following
    // a timeout/crash: its result may already exist at the provider.
    try {
      const order = await this.provider.createOrder(state.amountPaise, attemptId.slice(0, 40));
      if (!/^order_[A-Za-z0-9]+$/.test(order.id) || order.amount !== state.amountPaise || order.currency !== 'INR') throw new Error('Provider order mismatch');
      await this.db.runTransaction(async tx => {
        const attempt = await tx.get(ref);
        if (attempt.get('claim') !== claim || attempt.get('state') !== 'CREATING') throw new Error('Order claim lost');
        tx.create(this.db.collection('paymentOrders').doc(order.id), { attemptId });
        tx.update(ref, { state: 'ORDER_CREATED', orderId: order.id });
      });
      return { attemptId, orderId: order.id, amountPaise: state.amountPaise, currency: 'INR' };
    } catch {
      throw new AppError(503, 'PAYMENT_RECONCILIATION_REQUIRED', 'Order creation is awaiting reconciliation.');
    }
  }

  async settle(payment: ProviderPayment, eventId: string) {
    const orderRef = this.db.collection('paymentOrders').doc(documentId(payment.order_id));
    const eventRef = this.db.collection('paymentEvents').doc(documentId(eventId));
    await this.db.runTransaction(async tx => {
      const event = await tx.get(eventRef);
      if (event.exists) return;
      const order = await tx.get(orderRef);
      if (!order.exists) throw new AppError(409, 'UNKNOWN_PAYMENT_ORDER', 'Payment order has not been reconciled.');
      const attemptRef = this.db.collection('paymentAttempts').doc(order.get('attemptId'));
      const attempt = await tx.get(attemptRef);
      const invoiceRef = this.db.collection('payables').doc(attempt.get('invoiceId'));
      const invoice = await tx.get(invoiceRef);
      await tx.get(this.db.collection('users').doc(attempt.get('customerId')));
      const lockRef = invoiceRef.collection('locks').doc('activeAttempt');
      const lock = await tx.get(lockRef);
      if (payment.currency !== 'INR' || payment.amount !== attempt.get('amountPaise') ||
          payment.amount !== invoice.get('amountPaise') || !['captured', 'failed'].includes(payment.status)) {
        throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment facts do not match the invoice.');
      }
      if (payment.status === 'failed') {
        if (attempt.get('state') !== 'CAPTURED') {
          tx.update(attemptRef, { state: 'FAILED' });
          if (lock.get('attemptId') === attemptRef.id) tx.delete(lockRef);
        }
        tx.create(eventRef, { orderId: payment.order_id, paymentId: payment.id, at: new Date(), status: 'FAILED' });
        return;
      }
      if (attempt.get('state') === 'CAPTURED') {
        if (attempt.get('paymentId') !== payment.id) throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment needs review.');
      } else {
        if (invoice.get('status') !== 'CONFIRMED') throw new AppError(409, 'PAYMENT_MISMATCH', 'Invoice needs review.');
        tx.update(attemptRef, { state: 'CAPTURED', paymentId: payment.id });
        tx.update(invoiceRef, { status: 'CAPTURED', paymentId: payment.id });
        tx.create(invoiceRef.collection('receipts').doc('capture'), {
          paymentId: payment.id, amountPaise: payment.amount, currency: 'INR', at: new Date(),
        });
        tx.set(this.db.collection('users').doc(attempt.get('customerId')), { balanceUpdatedAt: new Date() }, { merge: true });
      }
      tx.create(eventRef, { orderId: payment.order_id, paymentId: payment.id, at: new Date() });
    });
  }
}
