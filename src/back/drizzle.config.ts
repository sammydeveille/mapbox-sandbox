import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(dir, '../../.env') });

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost', // TODO: use separate env var
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
    database: process.env.POSTGRES_DB!,
    ssl: false,
  },
} satisfies Config;
