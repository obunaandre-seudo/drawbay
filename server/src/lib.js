import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { query, transaction } from './db.js';

export const PORT = Number(process.env.PORT || 4000);
export const PROD = process.env.NODE_ENV === 'production';
if (PROD && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
export const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
export const id = () => crypto.randomUUID();
export const today = () => new Date().toISOString();
export const hash = password => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
};
export const check = (password, encoded) => {
  if (typeof encoded !== 'string') return false;
  const [salt, key] = encoded.split(':');
  if (!salt || !/^[0-9a-f]{128}$/i.test(key || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), crypto.scryptSync(password, salt, 64));
};
export const log = async (who, what, client = null) => (client || { query }).query('INSERT INTO audit (who, what) VALUES ($1, $2)', [who, what]);
export const safeUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, verified: u.verified });
export const sign = u => jwt.sign({ sub: u.id, role: u.role }, SECRET, { expiresIn: '8h', issuer: 'drawbay' });
export const projectOut = p => ({
  id: p.id, slug: p.slug, title: p.title, desc: p.description, category: p.category, style: p.style,
  price: Number(p.price), bedrooms: p.bedrooms, bathrooms: p.bathrooms, floors: p.floors,
  sellerId: p.seller_id, img: p.img, status: p.status, featured: p.featured,
  popularity: p.popularity, date: p.created_at?.toISOString?.().slice(0, 10) || p.created_at,
  files: p.files || [], feedback: p.feedback || undefined
});
export const orderOut = o => ({
  id: o.id, buyerId: o.buyer_id, projectId: o.project_id, sellerId: o.seller_id,
  amount: Number(o.amount), commission:Number(o.commission||0),date: o.created_at?.toISOString?.().slice(0, 10) || o.created_at, status: o.status
});
export { query, transaction };
