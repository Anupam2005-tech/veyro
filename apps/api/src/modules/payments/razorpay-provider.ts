import { AppError } from '../../shared/http/app-error.js';

export interface ProviderPayment {
  id: string; order_id: string; amount: number; currency: string; status: string;
}
export interface OrderProvider {
  createOrder(amount: number, receipt: string): Promise<{ id: string; amount: number; currency: string }>;
  fetchPayment(id: string): Promise<ProviderPayment>;
  listPayments?(orderId: string): Promise<ProviderPayment[]>;
  findOrders?(receipt: string): Promise<{ id: string; amount: number; currency: string; receipt: string }[]>;
}

function providerUnavailable() {
  return new AppError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Razorpay is temporarily unavailable. Check the payment status again shortly.');
}

function parsePayment(value: unknown): ProviderPayment {
  const row = value as Partial<ProviderPayment> | null;
  if (!row || typeof row.id !== 'string' || typeof row.order_id !== 'string' ||
      !Number.isSafeInteger(row.amount) || typeof row.currency !== 'string' || typeof row.status !== 'string') {
    throw providerUnavailable();
  }
  return row as ProviderPayment;
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
  async function request<T>(path: string, body?: unknown): Promise<T> {
    try {
      const response = await fetch('https://api.razorpay.com/v1/' + path, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: 'Basic ' + Buffer.from(keyId + ':' + secret).toString('base64'),
          'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw providerUnavailable();
      return await response.json() as T;
    } catch {
      throw providerUnavailable();
    }
  }
  return {
    createOrder: async (amount, receipt) => {
      return request<{ id: string; amount: number; currency: string }>('orders', {
        amount, currency: 'INR', receipt, partial_payment: false,
      });
    },
    findOrders: async receipt => {
      const data = await request<{ items?: unknown[] } | null>('orders?receipt=' + encodeURIComponent(receipt) + '&count=100');
      if (!Array.isArray(data?.items)) throw providerUnavailable();
      return data.items.filter((item): item is { id: string; amount: number; currency: string; receipt: string } => {
        if (!item || typeof item !== 'object') return false;
        const row = item as Record<string, unknown>;
        return row.receipt === receipt && typeof row.id === 'string' && typeof row.amount === 'number' && typeof row.currency === 'string';
      });
    },
    fetchPayment: async id => parsePayment(await request('payments/' + encodeURIComponent(id))),
    listPayments: async orderId => {
      const data = await request<{ count: number; items?: unknown[] } | null>('orders/' + encodeURIComponent(orderId) + '/payments');
      if (!Array.isArray(data?.items) || data.count !== data.items.length) throw providerUnavailable();
      return data.items.map(parsePayment);
    },
  };
}
