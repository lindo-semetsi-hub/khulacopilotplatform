# Khula AI

Khula AI is a crop-lifecycle application. The current first slice includes a
React interface, a Node.js/Express API, and an embedded PostgreSQL database for
farm profiles, crop cycles, and crop lifecycle events.

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

## Current scope

- Farm profiles can be created and stored in PostgreSQL.
- Crop cycles can be recorded for a farm and advanced through growth stages.
- Stage changes are recorded as crop events.
- No sample data is inserted; begin by adding a farm in the interface.

Authentication, subscriptions, weather, the learning hub, and marketplace
functionality are not implemented yet. This is a local-development setup and
should not be exposed publicly. A future switch to a shared PostgreSQL server
will require migrating the local data to that server.
