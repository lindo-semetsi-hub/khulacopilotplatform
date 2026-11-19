import 'dotenv/config';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { promisify } from 'node:util';
import { db, initializeDatabase } from './db/index.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const scrypt = promisify(scryptCallback);
const stages = [
  'seeded',
  'germination',
  'vegetative',
  'flowering',
  'fruit_development',
  'ready_for_harvest',
  'harvested'
];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sessionCookieName = 'khula_session';
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
const authAttemptWindowMs = 15 * 60 * 1000;
const authAttemptLimit = 20;
const authAttempts = new Map();

app.use(express.json({ limit: '1mb' }));

function requiredText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw Object.assign(new Error(`${label} is required.`), { status: 400 });
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function validDate(value, label, optional = false) {
  if ((value === '' || value == null) && optional) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error(`${label} must be a valid date.`), { status: 400 });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error(`${label} must be a valid date.`), { status: 400 });
  }
  return value;
}

function validId(value, label) {
  if (!uuidPattern.test(value)) {
    throw Object.assign(new Error(`${label} is invalid.`), { status: 400 });
  }
  return value;
}

function getSessionToken(request) {
  const cookies = request.headers.cookie || '';
  const prefix = `${sessionCookieName}=`;
  const cookie = cookies.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : null;
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function safeUser(row) {
  return {
    id: row.id,
    email: row.email,
    mobileNumber: row.mobile_number,
    subscription: row.subscription,
    emailVerified: row.email_verified,
    createdAt: row.created_at
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, n, r, p, saltValue, keyValue] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !saltValue || !keyValue) return false;
  const salt = Buffer.from(saltValue, 'base64');
  const expectedKey = Buffer.from(keyValue, 'base64');
  const derivedKey = await scrypt(password, salt, expectedKey.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024
  });
  return expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey);
}

function limitAuthAttempts(request, response, next) {
  const now = Date.now();
  const key = request.ip || request.socket.remoteAddress || 'unknown';
  let attempt = authAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    attempt = { count: 0, resetAt: now + authAttemptWindowMs };
    authAttempts.set(key, attempt);
  }
  attempt.count += 1;
  if (attempt.count > authAttemptLimit) {
    response.setHeader('Retry-After', Math.ceil((attempt.resetAt - now) / 1000));
    response.status(429).json({ error: 'Too many sign-in attempts. Please try again later.' });
    return;
  }
  next();
}

function setSessionCookie(response, token) {
  const attributes = [
    `${sessionCookieName}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(sessionDurationMs / 1000)}`
  ];
  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  response.setHeader('Set-Cookie', attributes.join('; '));
}

function clearSessionCookie(response) {
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function ensureEmailConfiguration() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.APP_BASE_URL) {
    throw Object.assign(
      new Error('Email verification is not configured. Set RESEND_API_KEY, EMAIL_FROM, and APP_BASE_URL in .env.'),
      { status: 503 }
    );
  }
}

async function sendVerificationEmail(email, token) {
  ensureEmailConfiguration();
  let baseUrl;
  try {
    baseUrl = new URL(process.env.APP_BASE_URL);
  } catch {
    throw Object.assign(new Error('APP_BASE_URL must be a valid http or https URL.'), { status: 500 });
  }
  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw Object.assign(new Error('APP_BASE_URL must use http or https.'), { status: 500 });
  }

  baseUrl.hash = new URLSearchParams({ verify: token }).toString();
  let delivery;
  try {
    delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject: 'Verify your Khula AI email address',
        text: `Verify your Khula AI account by opening this link: ${baseUrl.toString()}`,
        html: `<p>Verify your Khula AI account by opening this link:</p><p><a href="${baseUrl.toString()}">Verify email address</a></p><p>This link expires in 24 hours and can only be used once.</p>`
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw Object.assign(
      new Error('Could not reach Resend to send the verification email. Check your connection and try resending.'),
      { status: 502 }
    );
  }

  if (!delivery.ok) {
    throw Object.assign(
      new Error('Resend could not send the verification email. Check your API key and verified sender address.'),
      { status: 502 }
    );
  }
}

async function createSession(queryable, userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionDurationMs);
  await queryable.query(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashSessionToken(token), userId, expiresAt.toISOString()]
  );
  return token;
}

async function requireAuth(request, response, next) {
  try {
    const token = getSessionToken(request);
    if (!token) {
      response.status(401).json({ error: 'Please sign in to continue.' });
      return;
    }

    const result = await db.query(
      `SELECT u.id, u.email, u.mobile_number, u.subscription,
              u.email_verified, u.created_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.email_verified = TRUE`,
      [hashSessionToken(token)]
    );
    if (!result.rows.length) {
      clearSessionCookie(response);
      response.status(401).json({ error: 'Your session has expired. Please sign in again.' });
      return;
    }

    request.user = safeUser(result.rows[0]);
    next();
  } catch (error) {
    next(error);
  }
}

app.post('/api/auth/register', limitAuthAttempts, async (request, response, next) => {
  try {
    ensureEmailConfiguration();
    const body = request.body || {};
    const email = requiredText(body.email, 'Email').toLowerCase();
    const mobileNumber = requiredText(body.mobileNumber, 'Mobile number').replace(/[\s().-]/g, '');
    const password = requiredText(body.password, 'Password');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
    }
    if (!/^\+?\d{8,15}$/.test(mobileNumber)) {
      throw Object.assign(new Error('Enter a mobile number with 8 to 15 digits.'), { status: 400 });
    }
    if (Buffer.byteLength(password, 'utf8') < 10 || Buffer.byteLength(password, 'utf8') > 72) {
      throw Object.assign(
        new Error('Password must be at least 10 characters and no more than 72 bytes.'),
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = randomBytes(32).toString('base64url');
    const user = await db.transaction(async (tx) => {
      const inserted = await tx.query(
        `INSERT INTO users
          (email, mobile_number, password_hash, subscription, email_verified)
         VALUES ($1, $2, $3, 'basic', FALSE)
         RETURNING id, email, mobile_number, subscription, email_verified, created_at`,
        [email, mobileNumber, passwordHash]
      );
      await tx.query(
        `INSERT INTO email_verifications (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [
          inserted.rows[0].id,
          hashSessionToken(verificationToken),
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        ]
      );
      return safeUser(inserted.rows[0]);
    });

    await sendVerificationEmail(email, verificationToken);
    response.status(202).json({
      verificationRequired: true,
      email: user.email,
      message: 'We sent a verification link to your email address.'
    });
  } catch (error) {
    if (error.code === '23505') {
      response.status(409).json({ error: 'An account already uses that email or mobile number.' });
      return;
    }
    next(error);
  }
});

app.post('/api/auth/login', limitAuthAttempts, async (request, response, next) => {
  try {
    const body = request.body || {};
    const email = requiredText(body.email, 'Email').toLowerCase();
    const password = requiredText(body.password, 'Password');
    const result = await db.query(
      `SELECT id, email, mobile_number, password_hash, subscription,
              email_verified, created_at
       FROM users WHERE email = $1`,
      [email]
    );
    const account = result.rows[0];
    if (!account || !(await verifyPassword(password, account.password_hash))) {
      response.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }
    if (!account.email_verified) {
      response.status(403).json({
        error: 'Verify your email address before signing in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
      return;
    }

    const token = await createSession(db, account.id);
    setSessionCookie(response, token);
    response.json(safeUser(account));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/resend-verification', limitAuthAttempts, async (request, response, next) => {
  try {
    ensureEmailConfiguration();
    const email = requiredText(request.body?.email, 'Email').toLowerCase();
    const result = await db.query(
      'SELECT id, email, email_verified FROM users WHERE email = $1',
      [email]
    );
    const account = result.rows[0];
    if (!account || account.email_verified) {
      response.json({ message: 'If that account needs verification, a new link will be sent.' });
      return;
    }

    const token = randomBytes(32).toString('base64url');
    await db.query(
      `INSERT INTO email_verifications (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET token_hash = EXCLUDED.token_hash,
                     expires_at = EXCLUDED.expires_at,
                     created_at = now()`,
      [
        account.id,
        hashSessionToken(token),
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      ]
    );
    await sendVerificationEmail(account.email, token);
    response.json({ message: 'If that account needs verification, a new link will be sent.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-email', async (request, response, next) => {
  try {
    const token = requiredText(request.body?.token, 'Verification token');
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw Object.assign(new Error('This verification link is invalid or expired.'), { status: 400 });
    }

    const sessionToken = randomBytes(32).toString('base64url');
    const user = await db.transaction(async (tx) => {
      const verification = await tx.query(
        `SELECT u.id, u.email, u.mobile_number, u.subscription,
                u.email_verified, u.created_at
         FROM email_verifications v
         JOIN users u ON u.id = v.user_id
         WHERE v.token_hash = $1 AND v.expires_at > now()`,
        [hashSessionToken(token)]
      );
      if (!verification.rows.length) return null;

      const account = verification.rows[0];
      const verifiedAccounts = await tx.query(
        'SELECT COUNT(*)::int AS count FROM users WHERE email_verified = TRUE'
      );
      await tx.query(
        'UPDATE users SET email_verified = TRUE, updated_at = now() WHERE id = $1',
        [account.id]
      );
      if (verifiedAccounts.rows[0].count === 0) {
        await tx.query(
          'UPDATE farms SET owner_user_id = $1 WHERE owner_user_id IS NULL',
          [account.id]
        );
      }
      await tx.query('DELETE FROM email_verifications WHERE user_id = $1', [account.id]);
      await tx.query(
        'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
        [
          hashSessionToken(sessionToken),
          account.id,
          new Date(Date.now() + sessionDurationMs).toISOString()
        ]
      );
      return { ...account, email_verified: true };
    });

    if (!user) {
      response.status(400).json({ error: 'This verification link is invalid or expired.' });
      return;
    }
    setSessionCookie(response, sessionToken);
    response.json(safeUser(user));
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', async (request, response, next) => {
  try {
    const token = getSessionToken(request);
    if (!token) {
      response.json(null);
      return;
    }

    const result = await db.query(
      `SELECT u.id, u.email, u.mobile_number, u.subscription,
              u.email_verified, u.created_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.email_verified = TRUE`,
      [hashSessionToken(token)]
    );
    if (!result.rows.length) {
      clearSessionCookie(response);
      response.json(null);
      return;
    }
    response.json(safeUser(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', async (request, response, next) => {
  try {
    const token = getSessionToken(request);
    if (token) {
      await db.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashSessionToken(token)]);
    }
    clearSessionCookie(response);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', async (_request, response, next) => {
  try {
    await db.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/farms', requireAuth, async (request, response, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, owner_name, province, district, area_hectares,
              farm_type, soil_type, irrigation_method, created_at, updated_at
       FROM farms
       WHERE owner_user_id = $1
       ORDER BY created_at DESC`,
      [request.user.id]
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/farms', requireAuth, async (request, response, next) => {
  try {
    const name = requiredText(request.body.name, 'Farm name');
    const ownerName = requiredText(request.body.ownerName, 'Farm owner');
    const province = requiredText(request.body.province, 'Province');
    const district = requiredText(request.body.district, 'District');
    const areaHectares = Number(request.body.areaHectares);
    const farmType = request.body.farmType || 'crop';

    if (!Number.isFinite(areaHectares) || areaHectares <= 0) {
      throw Object.assign(new Error('Farm size must be greater than zero.'), { status: 400 });
    }
    if (!['crop', 'mixed'].includes(farmType)) {
      throw Object.assign(new Error('Farm type is invalid.'), { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO farms
        (owner_user_id, name, owner_name, province, district, area_hectares, farm_type, soil_type, irrigation_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, owner_name, province, district, area_hectares,
                 farm_type, soil_type, irrigation_method, created_at, updated_at`,
      [
        request.user.id,
        name,
        ownerName,
        province,
        district,
        areaHectares,
        farmType,
        optionalText(request.body.soilType),
        optionalText(request.body.irrigationMethod)
      ]
    );
    response.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/farms/:farmId/crop-cycles', requireAuth, async (request, response, next) => {
  try {
    const farmId = validId(request.params.farmId, 'Farm ID');
    const result = await db.query(
      `SELECT id, farm_id, crop_name, variety, field_name, planting_date,
              expected_harvest_date, seed_type, seed_supplier, fertilizer_used,
              irrigation_method, current_stage, notes, created_at, updated_at
       FROM crop_cycles
       WHERE farm_id = $1 AND EXISTS (
         SELECT 1 FROM farms f WHERE f.id = crop_cycles.farm_id AND f.owner_user_id = $2
       )
       ORDER BY planting_date DESC, created_at DESC`,
      [farmId, request.user.id]
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/farms/:farmId/crop-cycles', requireAuth, async (request, response, next) => {
  try {
    const farmId = validId(request.params.farmId, 'Farm ID');
    const cropName = requiredText(request.body.cropName, 'Crop name');
    const variety = requiredText(request.body.variety, 'Variety');
    const plantingDate = validDate(request.body.plantingDate, 'Planting date');
    const expectedHarvestDate = validDate(
      request.body.expectedHarvestDate,
      'Expected harvest date',
      true
    );
    const stage = request.body.currentStage || 'seeded';

    if (!stages.includes(stage)) {
      throw Object.assign(new Error('Growth stage is invalid.'), { status: 400 });
    }
    if (expectedHarvestDate && expectedHarvestDate < plantingDate) {
      throw Object.assign(
        new Error('Expected harvest date cannot be before planting date.'),
        { status: 400 }
      );
    }

    const farm = await db.query(
      'SELECT id FROM farms WHERE id = $1 AND owner_user_id = $2',
      [farmId, request.user.id]
    );
    if (!farm.rows.length) {
      response.status(404).json({ error: 'Farm not found.' });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const cropResult = await tx.query(
        `INSERT INTO crop_cycles
          (farm_id, crop_name, variety, field_name, planting_date, expected_harvest_date,
           seed_type, seed_supplier, fertilizer_used, irrigation_method, current_stage, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, farm_id, crop_name, variety, field_name, planting_date,
                   expected_harvest_date, seed_type, seed_supplier, fertilizer_used,
                   irrigation_method, current_stage, notes, created_at, updated_at`,
        [
          farmId,
          cropName,
          variety,
          optionalText(request.body.fieldName),
          plantingDate,
          expectedHarvestDate,
          optionalText(request.body.seedType),
          optionalText(request.body.seedSupplier),
          optionalText(request.body.fertilizerUsed),
          optionalText(request.body.irrigationMethod),
          stage,
          optionalText(request.body.notes)
        ]
      );
      await tx.query(
        `INSERT INTO crop_events (crop_cycle_id, event_type, occurred_on, growth_stage, notes)
         VALUES ($1, 'cycle_created', CURRENT_DATE, $2, $3)`,
        [cropResult.rows[0].id, stage, 'Crop cycle created']
      );
      return cropResult;
    });
    response.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/crop-cycles/:cropCycleId/stage', requireAuth, async (request, response, next) => {
  try {
    const cropCycleId = validId(request.params.cropCycleId, 'Crop cycle ID');
    const stage = requiredText(request.body.currentStage, 'Growth stage');
    const notes = optionalText(request.body.notes);
    if (!stages.includes(stage)) {
      throw Object.assign(new Error('Growth stage is invalid.'), { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const updated = await tx.query(
        `UPDATE crop_cycles
         SET current_stage = $2, updated_at = now()
         WHERE id = $1 AND EXISTS (
           SELECT 1 FROM farms f
           WHERE f.id = crop_cycles.farm_id AND f.owner_user_id = $3
         )
         RETURNING id, farm_id, crop_name, variety, field_name, planting_date,
                   expected_harvest_date, seed_type, seed_supplier, fertilizer_used,
                   irrigation_method, current_stage, notes, created_at, updated_at`,
        [cropCycleId, stage, request.user.id]
      );

      if (updated.rows.length === 0) return null;

      await tx.query(
        `INSERT INTO crop_events (crop_cycle_id, event_type, occurred_on, growth_stage, notes)
         VALUES ($1, 'stage_updated', CURRENT_DATE, $2, $3)`,
        [cropCycleId, stage, notes]
      );
      return updated.rows[0];
    });

    if (!result) {
      response.status(404).json({ error: 'Crop cycle not found.' });
      return;
    }

    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    error: error.status ? error.message : 'An unexpected server error occurred.'
  });
});

await initializeDatabase();
app.listen(port, '127.0.0.1', () => {
  console.log(`Khula AI API listening on http://127.0.0.1:${port}`);
  console.log(`Using local embedded PostgreSQL data in ${process.env.PGLITE_DATA_DIR || '.localdb'}.`);
});
