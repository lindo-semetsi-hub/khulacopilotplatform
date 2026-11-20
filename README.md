# Khula AI

Khula AI is a crop-lifecycle application. The local prototype includes a React
interface, a Node.js/Express API, embedded PostgreSQL storage, and
email/mobile registration with sign-in.

## Local setup

You need Node.js and npm. Local development uses PGlite, an embedded PostgreSQL
database, so a separate PostgreSQL server, pgAdmin, and database password are
not required.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Start the API and React development server:

   ```sh
   npm run dev
   ```

3. Open `http://127.0.0.1:5173`.

The API is available at `http://127.0.0.1:3001`. It creates or updates the
schema on startup. PostgreSQL data is stored in `.localdb/` and is ignored by
Git. Set `PGLITE_DATA_DIR` in `.env` if you want to store it elsewhere. The
`npm run db:migrate` command can also initialize/update the schema separately.
The API uses Node's system certificate store for outbound email requests,
which supports trusted company HTTPS inspection certificates without disabling
TLS verification.

## Current scope

- Accounts register with an email address, mobile number, and password. New
  accounts start on Basic; passwords are stored as scrypt hashes.
- In local development, registration signs the user in immediately so work can
  continue without an email provider. The profile clearly marks the email as
  unverified; accounts and farm data remain separated by user.
- When `NODE_ENV=production`, registration requires a one-time Resend email
  verification link before sign-in. Links expire after 24 hours.
- Before deploying, verify a sender domain in Resend and set `RESEND_API_KEY`,
  `EMAIL_FROM`, and `APP_BASE_URL` in the deployment environment.
- Farm profiles and crop cycles are private to the signed-in account.
- Crop cycles can be advanced through growth stages, with changes recorded as
  crop events.
- Basic includes the overview, farm/crop records, bundle catalogue preview,
  weather preview, and AI assistant preview. Learning Hub and Marketplace are
  Premium-only.
- Learning, Marketplace, MTN bundle pricing/availability, live weather, and AI
  responses are clearly marked previews; no external provider is connected.
- No sample data is inserted.

There is no phone verification, payment gateway, or Premium checkout. New users
receive Basic, and Premium-only pages remain locked until billing is designed
and implemented. The local development email-verification bypass is not an
identity check and must not be used as a production policy. A future switch to
a shared PostgreSQL server will require migrating the local data to that server.
