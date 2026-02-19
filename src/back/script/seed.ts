import { db } from '../src/db/index.js';
import { feedback } from '../src/db/schema.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(dir, '../../../.env') });

const data = JSON.parse(readFileSync(join(dir, '../data/pg.json'), 'utf-8'));

for (const item of data.feedback) {
  await db.insert(feedback).values(item);
}

console.log('Database seeded');
process.exit(0);
