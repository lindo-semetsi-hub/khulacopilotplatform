import 'dotenv/config';
import { db, initializeDatabase } from './index.js';

try {
  await initializeDatabase();
  console.log('Local PostgreSQL schema is ready.');
} catch (error) {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.close().catch((error) => {
    console.error('Could not close the local database:', error.message);
    process.exitCode = 1;
  });
}
