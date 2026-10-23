import crypto from 'node:crypto';
import { query, hash } from './lib.js';

export async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 16) {
    if (process.env.NODE_ENV === 'production') throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters before production startup');
    console.warn('Admin account was not seeded. Set ADMIN_EMAIL and ADMIN_PASSWORD to create one.');
    return;
  }
  const name = process.env.ADMIN_NAME || 'DrawBay Administrator';
  await query(
    "INSERT INTO users (role,name,email,pass,verified) VALUES ('admin',$1,$2,$3,true) ON CONFLICT (email) DO NOTHING",
    [name, email, hash(password)]
  );
  if (process.env.NODE_ENV !== 'production') console.info(`Admin account available: ${email}`);
}
