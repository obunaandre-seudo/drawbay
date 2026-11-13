import jwt from 'jsonwebtoken';
import { query, SECRET } from './lib.js';

export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const need = (...roles) => wrap(async (req, res, next) => {
  const authorization = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const cookie = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('drawbay_session='));
  const token = authorization || (cookie ? decodeURIComponent(cookie.slice('drawbay_session='.length)) : '');
  if (!token) return res.status(401).json({ error: 'Sign in required' });
  let claims;
  try { claims = jwt.verify(token, SECRET, { issuer: 'drawbay' }); }
  catch { return res.status(401).json({ error: 'Session expired' }); }
  const { rows } = await query('SELECT id, role, name, email, verified FROM users WHERE id = $1', [claims.sub]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Session expired' });
  if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'Access denied' });
  req.user = user;
  next();
});
export const approvedSeller = wrap(async (req, res, next) => {
  const { rows } = await query('SELECT application_status FROM seller_profiles WHERE user_id=$1', [req.user.id]);
  if (rows[0]?.application_status !== 'approved') {
    return res.status(403).json({ error: 'Seller features are available after your application is approved', code: 'seller_pending' });
  }
  next();
});
export const bad = (res, message) => res.status(400).json({ error: message });
