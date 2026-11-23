import { createHash } from 'node:crypto';
import type { DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore';
import { AppError } from '../../shared/http/app-error.js';
import { documentId } from '../quotes/quote-repository.js';
import { hasBookingBlockingBalance } from './booking-balance-policy.js';
import { enqueueNotification } from '../notifications/notifications.js';
import { type OrderProvider, type ProviderPayment } from './razorpay-provider.js';

interface Invoice {
  customerId: string; amountPaise: number; currency: 'INR';
  status: 'CONFIRMED' | 'CAPTURED'; isUnderActiveDispute: boolean;
}
const orderIdPattern = /^order_[A-Za-z0-9]+$/;
const keyPattern = /^[A-Za-z0-9_-]{1,128}$/;
export type InvoicePaymentStatus = 'READY' | 'PENDING' | 'FAILED' | 'CAPTURED' | 'DISPUTED' | 'REVIEW_REQUIRED';

function validateOrder(order: { id: string; amount: number; currency: string }, amountPaise: number) {
  if (!order || !orderIdPattern.test(order.id) || order.amount !== amountPaise || order.currency !== 'INR') {
    throw new AppError(409, 'PAYMENT_MISMATCH', 'Razorpay order does not match this invoice. Contact support.');
  }
  return order.id;
}

function awaitingOrder() {
  return new AppError(409, 'PAYMENT_RECONCILIATION_REQUIRED', 'The order is being reconciled. Check again shortly.');
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

  private async activeAttempt(tx: Transaction, invoiceRef: DocumentReference, uid: string) {
    const lock = await tx.get(invoiceRef.collection('locks').doc('activeAttempt'));
    const attempts = this.db.collection('paymentAttempts');
    // Earlier versions released the lock on failure and could create multiple orders.
    const previous = await tx.get(attempts.where('invoiceId', '==', invoiceRef.id).limit(2));
    if (previous.size > 1 || previous.docs.some(attempt => attempt.get('customerId') !== uid)) {
      throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This invoice has conflicting payment attempts. Contact support.');
    }
    if (lock.exists) {
      const attempt = previous.docs[0];
      if (attempt?.id === lock.get('attemptId')) return attempt;
      throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'This invoice requires payment review. Contact support.');
    }
    return previous.docs[0];
  }

  private assertPayable(invoice: Invoice) {
    if (invoice.status !== 'CONFIRMED' || invoice.isUnderActiveDispute ||
        invoice.currency !== 'INR' || !Number.isSafeInteger(invoice.amountPaise) || invoice.amountPaise < 100) {
      throw new AppError(409, 'PAYMENT_NOT_PAYABLE', 'This invoice cannot be paid.');
    }
  }

  async order(uid: string, invoiceId: string, key: string) {
    if (!keyPattern.test(key)) throw new AppError(400, 'INVALID_IDEMPOTENCY_KEY', 'Provide a valid idempotency key.');
    const invoiceRef = this.db.collection('payables').doc(documentId(invoiceId));
    const attemptId = createHash('sha256').update(uid + '\0' + invoiceId + '\0' + key).digest('hex');
    const ref = this.db.collection('paymentAttempts').doc(attemptId);
    const state = await this.db.runTransaction(async tx => {
      const invoice = (await tx.get(invoiceRef)).data() as Invoice | undefined;
      if (!invoice || invoice.customerId !== uid) throw new AppError(404, 'PAYMENT_NOT_ACCESSIBLE', 'Payment is unavailable.');
      this.assertPayable(invoice);
      const attempt = await this.activeAttempt(tx, invoiceRef, uid);
      if (attempt) {
        if (attempt.get('amountPaise') !== invoice.amountPaise) {
          throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'The existing order has a different amount. Contact support.');
        }
        const orderId = attempt.get('orderId') as string | undefined;
        if (!orderId) throw awaitingOrder();
        tx.set(invoiceRef.collection('locks').doc('activeAttempt'), { attemptId: attempt.id });
        return { attemptId: attempt.id, amountPaise: invoice.amountPaise, orderId };
      }
      tx.create(ref, { invoiceId, customerId: uid, amountPaise: invoice.amountPaise, currency: 'INR',
        state: 'CREATING', createLeaseUntil: Date.now() + 15_000 });
      tx.set(invoiceRef.collection('locks').doc('activeAttempt'), { attemptId });
      return { attemptId, amountPaise: invoice.amountPaise, orderId: undefined };
    });
    const orderId = state.orderId ?? await this.createProviderOrder(ref, state.amountPaise);
    return { attemptId: state.attemptId, orderId, amountPaise: state.amountPaise, currency: 'INR' };
  }

  private async createProviderOrder(ref: DocumentReference, amountPaise: number) {
    try {
      const order = await this.provider.createOrder(amountPaise, ref.id.slice(0, 40));
      return await this.linkOrder(ref, validateOrder(order, amountPaise));
    } catch {
      throw new AppError(503, 'PAYMENT_RECONCILIATION_REQUIRED', 'Order creation is awaiting reconciliation.');
    }
  }

  async reconcile(uid: string, invoiceId: string, key: string) {
    if (!keyPattern.test(key)) throw new AppError(400, 'INVALID_IDEMPOTENCY_KEY', 'Provide a valid idempotency key.');
    if (!this.provider.findOrders) {
      throw new AppError(503, 'PAYMENT_RECONCILIATION_REQUIRED', 'Order reconciliation unavailable.');
    }
    const invoiceRef = this.db.collection('payables').doc(documentId(invoiceId));
    const attempt = await this.db.runTransaction(async tx => {
      const invoice = (await tx.get(invoiceRef)).data() as Invoice | undefined;
      if (invoice?.customerId !== uid) throw new AppError(404, 'PAYMENT_NOT_ACCESSIBLE', 'Payment unavailable.');
      this.assertPayable(invoice);
      const active = await this.activeAttempt(tx, invoiceRef, uid);
      if (!active) throw new AppError(404, 'PAYMENT_NOT_ACCESSIBLE', 'Payment attempt unavailable.');
      if (active.get('amountPaise') !== invoice.amountPaise) {
        throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'The existing order has a different amount. Contact support.');
      }
      return active;
    });
    const attemptId = attempt.id;
    const linkedOrderId = attempt.get('orderId') as string | undefined;
    if (linkedOrderId) return { attemptId, orderId: linkedOrderId };
    if (attempt.get('state') !== 'CREATING') throw awaitingOrder();

    const orders = await this.provider.findOrders(attemptId.slice(0, 40));
    const amountPaise = attempt.get('amountPaise') as number;
    if (orders.length > 1) {
      throw new AppError(409, 'PAYMENT_REVIEW_REQUIRED', 'More than one Razorpay order matched. Contact support.');
    }
    if (orders[0]) {
      const orderId = await this.linkOrder(attempt.ref, validateOrder(orders[0], amountPaise));
      return { attemptId, orderId };
    }
    // Razorpay rejects duplicate receipts. Reclaim an expired create lease with the
    // original receipt so a lost response cannot result in a separate payable order.
    const existing = await this.db.runTransaction(async tx => {
      const current = await tx.get(attempt.ref);
      const invoice = (await tx.get(invoiceRef)).data() as Invoice | undefined;
      if (invoice?.customerId !== uid) throw new AppError(404, 'PAYMENT_NOT_ACCESSIBLE', 'Payment unavailable.');
      this.assertPayable(invoice);
      const orderId = current.get('orderId') as string | undefined;
      if (orderId) return orderId;
      if (current.get('state') !== 'CREATING' || (current.get('createLeaseUntil') ?? 0) > Date.now()) throw awaitingOrder();
      tx.update(attempt.ref, { createLeaseUntil: Date.now() + 15_000 });
    });
    return { attemptId, orderId: existing ?? await this.createProviderOrder(attempt.ref, amountPaise) };
  }

  private async linkOrder(ref: DocumentReference, orderId: string) {
    await this.db.runTransaction(async tx => {
      const current = await tx.get(ref);
      const mapping = this.db.collection('paymentOrders').doc(orderId);
      const existing = await tx.get(mapping);
      if (current.get('orderId') === orderId && existing.get('attemptId') === ref.id) return;
      if (current.get('state') !== 'CREATING' || existing.exists) throw new Error('Payment order mapping conflict');
      tx.create(mapping, { attemptId: ref.id });
      tx.update(ref, { state: 'ORDER_CREATED', orderId });
    });
    return orderId;
  }

  async status(uid: string, invoiceId: string): Promise<InvoicePaymentStatus> {
    const ref = this.db.collection('payables').doc(documentId(invoiceId));
    const { invoice, attempt } = await this.db.runTransaction(async tx => {
      const invoice = (await tx.get(ref)).data() as Invoice | undefined;
      if (invoice?.customerId !== uid) throw new AppError(404, 'PAYMENT_NOT_ACCESSIBLE', 'Payment unavailable.');
      const attempt = invoice.status === 'CONFIRMED' ? await this.activeAttempt(tx, ref, uid) : undefined;
      return { invoice, attempt };
    });
    if (invoice.isUnderActiveDispute) return 'DISPUTED';
    if (invoice.status === 'CAPTURED') return 'CAPTURED';
    if (!Number.isSafeInteger(invoice.amountPaise) || invoice.amountPaise < 100 || invoice.currency !== 'INR') return 'REVIEW_REQUIRED';
    if (!attempt) return invoice.status === 'CONFIRMED' ? 'READY' : 'REVIEW_REQUIRED';
    if (attempt.get('amountPaise') !== invoice.amountPaise) return 'REVIEW_REQUIRED';
    const orderId = attempt.get('orderId') as string | undefined;
    if (!orderId) {
      if (attempt.get('state') === 'CREATING') throw awaitingOrder();
      return 'REVIEW_REQUIRED';
    }
    if (!this.provider.listPayments) throw new AppError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Payment status is unavailable.');
    const payments = await this.provider.listPayments(orderId);
    if (payments.some(p => p.order_id !== orderId || p.currency !== invoice.currency || p.amount !== invoice.amountPaise)) {
      return 'REVIEW_REQUIRED';
    }
    const captured = payments.filter(p => p.status === 'captured');
    if (captured.length > 1 || payments.some(p => p.status === 'refunded')) return 'REVIEW_REQUIRED';
    if (captured[0]) {
      await this.settle(captured[0], 'status-captured-' + captured[0].id);
      return 'CAPTURED';
    }
    if (payments.some(p => p.status !== 'failed')) return 'PENDING';
    return payments.length ? 'FAILED' : 'READY';
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
      const earningsRef = this.db.collection('driverEarnings').doc(invoiceRef.id);
      const earnings = await tx.get(earningsRef);
      if (payment.currency !== 'INR' || payment.amount !== attempt.get('amountPaise') ||
          payment.amount !== invoice.get('amountPaise') || !['captured', 'failed'].includes(payment.status)) {
        throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment facts do not match the invoice.');
      }
      if (payment.status === 'failed') {
        // A failed payment is one attempt on this order. It can later authorize,
        // and another attempt on the same Razorpay order may already be pending.
        tx.create(eventRef, { orderId: payment.order_id, paymentId: payment.id, at: new Date(), status: 'FAILED' });
        return;
      }
      if (attempt.get('state') === 'CAPTURED') {
        if (attempt.get('paymentId') !== payment.id) throw new AppError(409, 'PAYMENT_MISMATCH', 'Payment needs review.');
      } else {
        if (invoice.get('status') !== 'CONFIRMED') throw new AppError(409, 'PAYMENT_MISMATCH', 'Invoice needs review.');
        tx.update(attemptRef, { state: 'CAPTURED', paymentId: payment.id });
        tx.update(invoiceRef, { status: 'CAPTURED', paymentId: payment.id });
        tx.create(this.db.collection('ledgerEntries').doc('capture-' + attemptRef.id), {
          kind: 'CAPTURE', customerId: attempt.get('customerId'), invoiceId: invoiceRef.id,
          paymentId: payment.id, amountPaise: payment.amount, currency: 'INR', at: new Date(),
        });
        if (earnings.exists && earnings.get('status') === 'ACCRUED') tx.update(earningsRef, { status: 'PAID', paidAt: new Date() });
        tx.create(invoiceRef.collection('receipts').doc('capture'), {
          paymentId: payment.id, amountPaise: payment.amount, currency: 'INR', at: new Date(),
        });
        tx.set(this.db.collection('users').doc(attempt.get('customerId')), { balanceUpdatedAt: new Date() }, { merge: true });
        enqueueNotification(this.db, tx, attempt.get('customerId'), 'payment-' + attemptRef.id, 'PAYMENT_CAPTURED', invoiceRef.id);
      }
      tx.create(eventRef, { orderId: payment.order_id, paymentId: payment.id, at: new Date() });
    });
  }
}
