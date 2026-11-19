# Khula AI

Khula AI is a crop-lifecycle application. The local prototype includes a React
interface, a Node.js/Express API, embedded PostgreSQL storage, and
email/mobile registration with sign-in.

## Local setup

You need Node.js and npm. Local development uses PGlite, an embedded PostgreSQL
database, so a separate PostgreSQL server, pgAdmin, and database password are
not required. Email verification uses the Resend API.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a Resend account, verify a sender domain, and create an API key. Add
   `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_BASE_URL` from `.env.example` to your
   existing `.env`; keep your other local settings and keep `.env` private.

3. Start the API and React development server:

   ```sh
   npm run dev
   ```

4. Open `http://127.0.0.1:5173`.

The API is available at `http://127.0.0.1:3001`. It creates or updates the
schema on startup. PostgreSQL data is stored in `.localdb/` and is ignored by
Git. Set `PGLITE_DATA_DIR` in `.env` if you want to store it elsewhere. The
`npm run db:migrate` command can also initialize/update the schema separately.

## Current scope

- Accounts register with an email address, mobile number, and password. New
  accounts start on Basic; passwords are stored as scrypt hashes.
- Registration sends a one-time email verification link through Resend. Users
  cannot sign in until they verify. Links expire after 24 hours.
- The verification link returns to `APP_BASE_URL`; use the local app URL for
  development and your deployed HTTPS URL for a real deployment.
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
and implemented. This authentication setup is for local development and is not
ready to expose publicly. A future switch to a shared PostgreSQL server will
require migrating the local data to that server.
