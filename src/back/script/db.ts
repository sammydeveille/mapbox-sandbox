import pg from 'pg';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(dir, '../../../.env') });

const { Pool } = pg;

const getPool = (database?: string) => new Pool({
  host: 'localhost',  // TODO: use separate env var
  port: Number(process.env.POSTGRES_PORT),
  database: database || process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

export async function ensureDatabase() {
  const pool = getPool('postgres');
  try {
    const dbName = process.env.POSTGRES_DB;
    if (!dbName) throw new Error('POSTGRES_DB not set');
    
    const result = await pool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (result.rowCount === 0) {
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created`);
    }
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await pool.end();
  }
}

if (process.argv[2] === 'ensure') ensureDatabase();
