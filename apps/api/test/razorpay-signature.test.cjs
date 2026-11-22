const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { test } = require('node:test');
const { verifyRazorpayCheckoutSignature, verifyRazorpayWebhookSignature } =
  require('../dist/modules/payments/razorpay-signature.js');

const checkoutKey = 'fixture-checkout-key';
const webhookKey = 'fixture-webhook-key';
const sign = (key, input) => createHmac('sha256', key).update(input).digest('hex');

test('checkout matches the verified stored order and signed payment ID', () => {
  const signature = sign(checkoutKey, 'order_fixture|pay_fixture');
  assert.equal(verifyRazorpayCheckoutSignature('order_fixture', 'order_fixture', 'pay_fixture', signature, checkoutKey), true);
  assert.equal(verifyRazorpayCheckoutSignature('order_other', 'order_fixture', 'pay_fixture', signature, checkoutKey), false);
  assert.equal(verifyRazorpayCheckoutSignature('order_fixture', 'order_fixture', 'pay_other', signature, checkoutKey), false);
  assert.equal(verifyRazorpayCheckoutSignature('order_fixture', 'order_fixture', 'pay_fixture', signature, webhookKey), false);
});

test('webhook HMAC verifies original bytes and rejects reserialized content', () => {
  const original = Buffer.from('{ "event": "payment.captured" }');
  const reserialized = Buffer.from(JSON.stringify(JSON.parse(original)));
  const signature = sign(webhookKey, original);
  assert.equal(verifyRazorpayWebhookSignature(original, signature, webhookKey), true);
  assert.equal(verifyRazorpayWebhookSignature(reserialized, signature, webhookKey), false);
  assert.equal(verifyRazorpayWebhookSignature(JSON.parse(original), signature, webhookKey), false);
});

test('rejects missing keys and signatures with invalid encoding or trailing data', () => {
  const body = Buffer.from('{}');
  const signature = sign(webhookKey, body);
  for (const invalid of [null, '', 'z'.repeat(64), signature + '\n']) {
    assert.equal(verifyRazorpayWebhookSignature(body, invalid, webhookKey), false);
  }
  assert.equal(verifyRazorpayWebhookSignature(body, signature, ''), false);
});
