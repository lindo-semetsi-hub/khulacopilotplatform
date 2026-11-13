# AgriConnect

AgriConnect is a crop-lifecycle application. The current first slice includes a
React interface, a Node.js/Express API, and a PostgreSQL schema for farm
profiles, crop cycles, and crop lifecycle events.

## Local setup

You need Node.js, npm, and a running PostgreSQL server.

1. Create a PostgreSQL database named `agriconnect` using pgAdmin or `createdb`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your local database
   connection string.
3. Install dependencies:

   ```sh
   npm install
   ```

4. Create the initial tables:

   ```sh
   npm run db:migrate
   ```

5. Start the API and React development server:

   ```sh
   npm run dev
   ```

6. Open `http://127.0.0.1:5173`.

The API is available at `http://127.0.0.1:3001`; `/api/health` checks its
connection to PostgreSQL. Database changes are kept in
`server/db/migrations/`.

## Current scope

- Farm profiles can be created and stored in PostgreSQL.
- Crop cycles can be recorded for a farm and advanced through growth stages.
- Stage changes are recorded as crop events.
- No sample data is inserted; begin by adding a farm in the interface.

Authentication, subscriptions, weather, the learning hub, and marketplace
functionality are not implemented yet. This initial local-development API does
not include user authentication and should not be exposed publicly.
