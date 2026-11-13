import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const directory = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and configure it.');
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  const migration = await readFile(
    path.join(directory, 'migrations', '001_initial_schema.sql'),
    'utf8'
  );
  await client.connect();
  await client.query(migration);
  console.log('Database schema is ready.');
} catch (error) {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch((error) => {
    console.error('Could not close the database connection:', error.message);
    process.exitCode = 1;
  });
}
