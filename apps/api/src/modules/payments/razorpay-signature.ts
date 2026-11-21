import { createHmac, timingSafeEqual } from 'node:crypto';

function signatureMatches(message: string | Buffer, signature: unknown, key: string): boolean {
  if (typeof signature !== 'string' || signature.length !== 64 || !/^[0-9a-f]{64}$/i.test(signature) || !key) {
    return false;
  }
  const expected = createHmac('sha256', key).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function verifyRazorpayCheckoutSignature(
  storedOrderId: string,
  callbackOrderId: string,
  paymentId: string,
  signature: unknown,
  keySecret: string,
): boolean {
  if (typeof storedOrderId !== 'string' || typeof paymentId !== 'string' ||
      !storedOrderId || !paymentId || /[|\s]/.test(storedOrderId) || /[|\s]/.test(paymentId) ||
      callbackOrderId !== storedOrderId) {
    return false;
  }
  return signatureMatches(storedOrderId + '|' + paymentId, signature, keySecret);
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: unknown, webhookSecret: string): boolean {
  return Buffer.isBuffer(rawBody) && signatureMatches(rawBody, signature, webhookSecret);
}
