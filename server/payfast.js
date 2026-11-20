import { createHash, timingSafeEqual } from 'node:crypto';

export const bundleCatalog = Object.freeze({
  once_1_5gb: Object.freeze({ name: '1.5GB Anytime Data', amountCents: 3499, recurring: false }),
  once_5gb_40min: Object.freeze({ name: '5GB Anytime Data + 40min voice', amountCents: 10500, recurring: false }),
  once_7gb_50min: Object.freeze({ name: '7GB Anytime Data + 50min voice', amountCents: 14999, recurring: false }),
  monthly_10gb_80min: Object.freeze({ name: '10GB Anytime Data + 80min voice', amountCents: 19999, recurring: true }),
  monthly_15gb_100min: Object.freeze({ name: '15GB Anytime Data + 100min voice', amountCents: 23999, recurring: true }),
  monthly_20gb_100min: Object.freeze({ name: '20GB Anytime Data + 100min voice', amountCents: 30999, recurring: true })
});

const checkoutUrls = {
  sandbox: 'https://sandbox.payfast.co.za/eng/process',
  live: 'https://www.payfast.co.za/eng/process'
};

const validationUrls = {
  sandbox: 'https://sandbox.payfast.co.za/eng/query/validate',
  live: 'https://www.payfast.co.za/eng/query/validate'
};

export function isPayFastConfigured(environment = process.env) {
  return Boolean(
    environment.PAYFAST_MERCHANT_ID?.trim() &&
    environment.PAYFAST_MERCHANT_KEY?.trim() &&
    environment.PAYFAST_PASSPHRASE?.trim() &&
    environment.PAYFAST_NOTIFY_URL?.trim() &&
    environment.APP_BASE_URL?.trim()
  );
}

export function isPayFastCheckoutAvailable(environment = process.env) {
  const mode = environment.PAYFAST_MODE?.trim() || 'sandbox';
  return isPayFastConfigured(environment) && mode === 'sandbox';
}

function payFastSettings(environment) {
  if (!isPayFastConfigured(environment)) {
    throw Object.assign(
      new Error('PayFast checkout is not configured. Add the PayFast settings to the server .env file.'),
      { status: 503 }
    );
  }

  const mode = environment.PAYFAST_MODE?.trim() || 'sandbox';
  if (!Object.hasOwn(checkoutUrls, mode)) {
    throw Object.assign(new Error('PAYFAST_MODE must be sandbox or live.'), { status: 503 });
  }

  let appUrl;
  let notifyUrl;
  try {
    appUrl = new URL(environment.APP_BASE_URL);
    notifyUrl = new URL(environment.PAYFAST_NOTIFY_URL);
  } catch {
    throw Object.assign(
      new Error('APP_BASE_URL and PAYFAST_NOTIFY_URL must be valid absolute URLs.'),
      { status: 503 }
    );
  }

  if (appUrl.protocol !== 'https:' && mode === 'live') {
    throw Object.assign(new Error('Live PayFast checkout requires an HTTPS APP_BASE_URL.'), { status: 503 });
  }
  if (notifyUrl.protocol !== 'https:') {
    throw Object.assign(
      new Error('PAYFAST_NOTIFY_URL must be a public HTTPS URL reachable by PayFast.'),
      { status: 503 }
    );
  }

  return {
    mode,
    appUrl,
    notifyUrl,
    merchantId: environment.PAYFAST_MERCHANT_ID.trim(),
    merchantKey: environment.PAYFAST_MERCHANT_KEY.trim(),
    passphrase: environment.PAYFAST_PASSPHRASE.trim()
  };
}

function encodePayFastValue(value) {
  return encodeURIComponent(String(value).trim())
    .replace(/[!'()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    )
    .replace(/%20/g, '+');
}

export function payFastSignature(fields, passphrase = '') {
  const parameters = Object.entries(fields)
    .filter(([key, value]) => key !== 'signature' && value !== '' && value != null)
    .map(([key, value]) => `${key}=${encodePayFastValue(value)}`);
  if (passphrase) parameters.push(`passphrase=${encodePayFastValue(passphrase)}`);
  return createHash('md5').update(parameters.join('&')).digest('hex');
}

export function hasValidPayFastSignature(fields, passphrase = '') {
  if (!fields || Object.values(fields).some((value) => typeof value !== 'string')) return false;
  const signature = fields.signature;
  if (typeof signature !== 'string' || !/^[a-f0-9]{32}$/i.test(signature)) return false;

  const expected = Buffer.from(payFastSignature(fields, passphrase), 'hex');
  const received = Buffer.from(signature, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function southAfricanBillingDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function createPayFastCheckout({
  bundle,
  orderId,
  email,
  environment = process.env,
  now = new Date()
}) {
  const settings = payFastSettings(environment);
  if (settings.mode === 'live') {
    throw Object.assign(
      new Error('Live payments are disabled until seller order management and customer cancellation are supported.'),
      { status: 503 }
    );
  }
  const amount = (bundle.amountCents / 100).toFixed(2);
  const returnUrl = new URL('/', settings.appUrl);
  returnUrl.searchParams.set('bundle_order', orderId);
  returnUrl.searchParams.set('payment_return', 'success');
  const cancelUrl = new URL('/', settings.appUrl);
  cancelUrl.searchParams.set('bundle_order', orderId);
  cancelUrl.searchParams.set('payment_return', 'cancelled');

  const fields = {
    merchant_id: settings.merchantId,
    merchant_key: settings.merchantKey,
    return_url: returnUrl.toString(),
    cancel_url: cancelUrl.toString(),
    notify_url: settings.notifyUrl.toString(),
    email_address: email,
    m_payment_id: orderId,
    amount,
    item_name: bundle.name,
    item_description: bundle.name
  };

  if (bundle.recurring) {
    fields.subscription_type = '1';
    fields.billing_date = southAfricanBillingDate(now);
    fields.recurring_amount = amount;
    fields.frequency = '3';
    fields.cycles = '0';
  }

  fields.signature = payFastSignature(fields, settings.passphrase);
  return { actionUrl: checkoutUrls[settings.mode], fields };
}

export async function validatePayFastNotification(
  fields,
  { environment = process.env, fetchImpl = fetch } = {}
) {
  const settings = payFastSettings(environment);
  if (!hasValidPayFastSignature(fields, settings.passphrase)) return false;

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);

  let response;
  try {
    response = await fetchImpl(validationUrls[settings.mode], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    console.error('PayFast ITN validation request failed:', error.cause?.code || error.name);
    throw Object.assign(
      new Error('Could not validate the PayFast notification.'),
      { status: 502 }
    );
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(`PayFast ITN validation returned HTTP ${response.status}.`),
      { status: 502 }
    );
  }

  return (await response.text()).trim() === 'VALID';
}
