import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(dir, '../../../.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST_LOCAL,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const db = drizzle(pool);

console.log('Database seeded');
process.exit(0);
