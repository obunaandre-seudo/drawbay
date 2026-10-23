import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabaseUrl } from '../../api/production-config.js';

const { Pool } = pg;
const connectionString = getDatabaseUrl(process.env);
if (process.env.NODE_ENV === 'production' && !connectionString) throw new Error('DATABASE_URL or POSTGRES_URL is required in production');
export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export const query = (text, values) => pool.query(text, values);
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function migrate() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const schema = await fs.readFile(path.join(here, 'schema.sql'), 'utf8');
  await query(schema);
}
