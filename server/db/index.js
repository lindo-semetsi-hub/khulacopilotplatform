import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const directory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(process.env.PGLITE_DATA_DIR || '.localdb');
export const db = new PGlite(dataDirectory);

export async function initializeDatabase() {
  await db.waitReady;
  const migration = await readFile(
    path.join(directory, 'migrations', '001_initial_schema.sql'),
    'utf8'
  );
  await db.exec(migration);
}
