import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { feedback } from '../src/db/schema.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(dir, '../../../.env') });

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',   // TODO: use separate env
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const db = drizzle(pool);

const data = JSON.parse(readFileSync(join(dir, '../data/pg.json'), 'utf-8'));

for (const item of data.feedback) {
  await db.insert(feedback).values(item);
}

console.log('Database seeded');
process.exit(0);
