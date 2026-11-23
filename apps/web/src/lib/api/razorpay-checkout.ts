import type { AuthUser } from '../auth/types';
import { request, ApiClientError } from './transport';

interface PaymentResponse { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
interface CheckoutOptions {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string;
  handler: (result: PaymentResponse) => void; modal: { ondismiss: () => void };
}
type CheckoutConstructor = new (options: CheckoutOptions) => {
  open: () => void;
  on?: (event: 'payment.failed', handler: () => void) => void;
};
declare global { interface Window { Razorpay?: CheckoutConstructor } }
export type CheckoutStatus = 'READY' | 'PENDING' | 'FAILED' | 'CAPTURED' | 'DISPUTED' | 'REVIEW_REQUIRED';
let loading: Promise<void> | undefined;
async function loadCheckout() {
  if (window.Razorpay) return;
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(new ApiClientError('Checkout could not load. Check your connection and try again.', 'CHECKOUT_UNAVAILABLE'));
    };
    const timer = window.setTimeout(fail, 15000);
    script.onload = () => {
      if (!window.Razorpay) { fail(); return; }
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  await loading;
}

export async function checkCheckout(user: AuthUser, invoiceId: string): Promise<CheckoutStatus> {
  const result = await request<{ status: CheckoutStatus }>('/payments/status', {
    method: 'POST', body: JSON.stringify({ invoiceId }),
  }, await user.getIdToken());
  return result.status;
}

export async function openCheckout(user: AuthUser, invoiceId: string): Promise<CheckoutStatus> {
  const init = { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ invoiceId }) };
  let status: CheckoutStatus;
  try {
    status = await checkCheckout(user, invoiceId);
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.code !== 'PAYMENT_RECONCILIATION_REQUIRED') throw error;
    await request('/payments/reconcile', init, await user.getIdToken());
    status = await checkCheckout(user, invoiceId);
  }
  if (status !== 'READY' && status !== 'FAILED') return status;
  await loadCheckout();
  type Order = { attemptId: string; orderId: string; keyId: string; amountPaise: number; currency: string };
  let result: Order;
  try {
    result = await request<Order>('/payments/orders', init, await user.getIdToken());
  } catch (error) {
    if (error instanceof ApiClientError && error.code === 'PAYMENT_NOT_PAYABLE') {
      const updated = await checkCheckout(user, invoiceId);
      if (updated !== 'READY' && updated !== 'FAILED') return updated;
    }
    if (!(error instanceof ApiClientError) || error.code !== 'PAYMENT_RECONCILIATION_REQUIRED') throw error;
    await request('/payments/reconcile', init, await user.getIdToken());
    status = await checkCheckout(user, invoiceId);
    if (status !== 'READY' && status !== 'FAILED') return status;
    result = await request<Order>('/payments/orders', init, await user.getIdToken());
  }
  if (!Number.isSafeInteger(result.amountPaise) || result.amountPaise < 100 || result.currency !== 'INR') throw new ApiClientError('Invalid server payment order.');
  if (!/^rzp_test_/.test(result.keyId)) throw new ApiClientError('Only Test Mode checkout is supported.');
  return new Promise((resolve, reject) => {
    let finished = false;
    let failedInCheckout = false;
    const checkout = new window.Razorpay!({ key: result.keyId, order_id: result.orderId, amount: result.amountPaise,
      currency: result.currency, name: 'Veyro Test Mode', description: 'Trip fare · Test payment',
      handler: response => {
        if (finished) return;
        finished = true;
        void user.getIdToken().then(token => request<{ status: CheckoutStatus }>('/payments/verify', {
          method: 'POST', body: JSON.stringify({ ...response, attemptId: result.attemptId }),
        }, token)).then(verified => resolve(verified.status)).catch(reject);
      }, modal: { ondismiss: () => {
        if (finished) return;
        finished = true;
        void checkCheckout(user, invoiceId).then(current => {
          if (current !== 'READY') return resolve(current);
          if (failedInCheckout) return resolve('FAILED');
          reject(new ApiClientError('Checkout closed. You can reopen it when ready.', 'CHECKOUT_CLOSED'));
        }).catch(reject);
      } } });
    checkout.on?.('payment.failed', () => { failedInCheckout = true; });
    checkout.open();
  });
}

export function paymentStatusMessage(status: CheckoutStatus): string {
  switch (status) {
    case 'CAPTURED': return 'Payment confirmed.';
    case 'PENDING': return 'Razorpay is still verifying this payment. Check its status before trying again.';
    case 'FAILED': return 'The payment attempt failed. You can retry from the same checkout.';
    case 'DISPUTED': return 'This fare is under dispute. Checkout is paused until it is resolved.';
    case 'REVIEW_REQUIRED': return 'This payment needs review. Contact support before trying again.';
    case 'READY': return 'No payment has been recorded. You can open checkout.';
  }
}
