import { AppError } from '../../shared/http/app-error.js';

export interface ProviderPayment {
  id: string; order_id: string; amount: number; currency: string; status: string;
}
export interface OrderProvider {
  createOrder(amount: number, receipt: string): Promise<{ id: string; amount: number; currency: string }>;
  fetchPayment(id: string): Promise<ProviderPayment>;
}

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? '';
  const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
  if (!/^rzp_test_[A-Za-z0-9]+$/.test(keyId) || !secret) {
    throw new AppError(503, 'PAYMENTS_UNAVAILABLE', 'Test payments are unavailable.');
  }
  return { keyId, secret };
}

export function razorpayProvider(): OrderProvider {
  const { keyId, secret } = razorpayConfig();
  async function request(path: string, body?: unknown) {
    const response = await fetch('https://api.razorpay.com/v1/' + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64'),
        'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new AppError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Payment verification is unavailable.');
    const value = await response.json() as Partial<ProviderPayment>;
    if (typeof value.id !== 'string' || typeof value.amount !== 'number' || typeof value.currency !== 'string') {
      throw new AppError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Payment verification is unavailable.');
    }
    return value;
  }
  return {
    createOrder: async (amount, receipt) => {
      const order = await request('orders', { amount, currency: 'INR', receipt });
      return { id: order.id!, amount: order.amount!, currency: order.currency! };
    },
    fetchPayment: async id => {
      const payment = await request('payments/' + encodeURIComponent(id));
      if (typeof payment.order_id !== 'string' || typeof payment.status !== 'string') {
        throw new AppError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Payment verification is unavailable.');
      }
      return payment as ProviderPayment;
    },
  };
}
