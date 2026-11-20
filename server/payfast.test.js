import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bundleCatalog,
  createPayFastCheckout,
  hasValidPayFastSignature,
  isPayFastCheckoutAvailable,
  payFastSignature,
  validatePayFastNotification
} from './payfast.js';

const environment = {
  PAYFAST_MODE: 'sandbox',
  PAYFAST_MERCHANT_ID: 'merchant-test',
  PAYFAST_MERCHANT_KEY: 'key-test',
  PAYFAST_PASSPHRASE: 'phrase-test',
  PAYFAST_NOTIFY_URL: 'https://khula.example.test/api/payments/payfast/notify',
  APP_BASE_URL: 'http://127.0.0.1:5173/'
};

test('creates signed one-time and monthly PayFast checkout fields', () => {
  const oneTime = createPayFastCheckout({
    bundle: bundleCatalog.once_1_5gb,
    orderId: '79fbd720-ec6d-4c8f-89b1-8288101d5891',
    email: 'farmer@example.test',
    environment
  });
  assert.equal(oneTime.actionUrl, 'https://sandbox.payfast.co.za/eng/process');
  assert.equal(oneTime.fields.amount, '34.99');
  assert.equal(
    hasValidPayFastSignature(oneTime.fields, environment.PAYFAST_PASSPHRASE),
    true
  );
  assert.equal(oneTime.fields.subscription_type, undefined);

  const monthly = createPayFastCheckout({
    bundle: bundleCatalog.monthly_10gb_80min,
    orderId: '79fbd720-ec6d-4c8f-89b1-8288101d5891',
    email: 'farmer@example.test',
    environment,
    now: new Date('2026-01-31T12:00:00.000Z')
  });
  assert.equal(monthly.fields.subscription_type, '1');
  assert.equal(monthly.fields.billing_date, '2026-01-31');
  assert.equal(monthly.fields.recurring_amount, '199.99');
  assert.equal(monthly.fields.frequency, '3');
  assert.equal(monthly.fields.cycles, '0');
});

test('blocks live payments until order management and cancellation are supported', () => {
  assert.throws(
    () => createPayFastCheckout({
      bundle: bundleCatalog.once_1_5gb,
      orderId: '79fbd720-ec6d-4c8f-89b1-8288101d5891',
      email: 'farmer@example.test',
      environment: {
        ...environment,
        PAYFAST_MODE: 'live',
        APP_BASE_URL: 'https://khula.example.test/'
      }
    }),
    /Live payments are disabled/
  );
});

test('requires signed sandbox configuration and a public HTTPS notification URL', () => {
  assert.equal(isPayFastCheckoutAvailable(environment), true);
  assert.equal(isPayFastCheckoutAvailable({ ...environment, PAYFAST_PASSPHRASE: '' }), false);
  assert.throws(
    () => createPayFastCheckout({
      bundle: bundleCatalog.once_1_5gb,
      orderId: '79fbd720-ec6d-4c8f-89b1-8288101d5891',
      email: 'farmer@example.test',
      environment: { ...environment, PAYFAST_NOTIFY_URL: 'http://127.0.0.1:3001/api/payments/payfast/notify' }
    }),
    /public HTTPS URL/
  );
});

test('rejects a PayFast notification with a tampered amount before postback', async () => {
  const fields = {
    merchant_id: 'merchant-test',
    pf_payment_id: '12345',
    m_payment_id: '79fbd720-ec6d-4c8f-89b1-8288101d5891',
    amount_gross: '34.99',
    payment_status: 'COMPLETE'
  };
  fields.signature = payFastSignature(fields, environment.PAYFAST_PASSPHRASE);
  fields.amount_gross = '0.01';
  let postbackCalled = false;

  const valid = await validatePayFastNotification(fields, {
    environment,
    fetchImpl: async () => {
      postbackCalled = true;
      return new Response('VALID');
    }
  });

  assert.equal(valid, false);
  assert.equal(postbackCalled, false);
});

test('requires PayFast server validation for signed notifications', async () => {
  const fields = {
    merchant_id: 'merchant-test',
    pf_payment_id: '12345',
    m_payment_id: '79fbd720-ec6d-4c8f-89b1-8288101d5891',
    amount_gross: '34.99',
    payment_status: 'COMPLETE'
  };
  fields.signature = payFastSignature(fields, environment.PAYFAST_PASSPHRASE);
  let postbackUrl;

  const valid = await validatePayFastNotification(fields, {
    environment,
    fetchImpl: async (url, options) => {
      postbackUrl = url;
      assert.equal(options.method, 'POST');
      assert.equal(
        new URLSearchParams(options.body).get('signature'),
        fields.signature
      );
      return new Response('VALID');
    }
  });

  assert.equal(postbackUrl, 'https://sandbox.payfast.co.za/eng/query/validate');
  assert.equal(valid, true);
});
