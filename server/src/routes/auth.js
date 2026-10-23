import crypto from 'node:crypto';
import { query, transaction, hash, check, sign, safeUser, log } from '../lib.js';
import { wrap, need, bad } from '../middleware.js';
import { issueToken } from '../mail.js';

const emailPattern = /^\S+@\S+\.\S+$/;
const baseUrl = () => process.env.APP_URL || 'http://localhost:5173';
const sessionCookie = token => `drawbay_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const sendToken = async (user, purpose) => issueToken({ query }, user.id, purpose, baseUrl(), user.email, user.role);

export default function authRoutes(app) {
  app.get('/api/health', wrap(async (_, res) => {
    await query('SELECT 1');
    res.json({ ok: true, service: 'drawbay' });
  }));

  app.post('/api/auth/register', wrap(async (req, res) => {
    if (process.env.NODE_ENV === 'production' && (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)) {
      return res.status(503).json({ error: 'Account verification email is not configured. Contact the site administrator.' });
    }
    const role = req.body?.role;
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!['buyer', 'seller'].includes(role)) return bad(res, 'Choose a buyer or seller account');
    if (name.length < 2 || name.length > 120 || !emailPattern.test(email) || email.length > 254) return bad(res, 'Enter your name and a valid email');
    if (password.length < 12 || password.length > 256) return bad(res, 'Use a password with at least 12 characters');
    const user = await transaction(async client => {
      const { rows } = await client.query(
        'INSERT INTO users (role,name,email,pass) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING RETURNING id,role,name,email,verified',
        [role, name, email, hash(password)]
      );
      const created = rows[0];
      if (created?.role === 'seller') {
        const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'studio'}-${created.id.slice(0,8)}`;
        await client.query('INSERT INTO seller_profiles (user_id,slug,studio) VALUES ($1,$2,$3)', [created.id,slug,`${name} Studio`]);
      }
      return created;
    });
    if (!user) return res.status(409).json({ error: 'An account with that email already exists' });
    await log(email, `Registered ${role} account`);
    try { await sendToken(user, 'verify'); }
    catch (e) {
      console.error('Verification email could not be sent:', e.message);
      return res.status(503).json({ error: 'Your account was created, but the verification email could not be sent. Use the resend verification option or contact support.' });
    }
    res.status(201).json({ message: 'Check your inbox for a verification link.' });
  }));

  app.post('/api/auth/verify-email', wrap(async (req, res) => {
    const raw = String(req.body?.token || '');
    if (raw.length < 30 || raw.length > 100) return bad(res, 'Verification link is invalid or expired');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const result = await transaction(async client => {
      const token = await client.query("SELECT user_id FROM email_tokens WHERE token_hash=$1 AND purpose='verify' AND expires_at>now() FOR UPDATE", [tokenHash]);
      if (!token.rows[0]) return false;
      await client.query('UPDATE users SET verified=true WHERE id=$1', [token.rows[0].user_id]);
      await client.query('DELETE FROM email_tokens WHERE token_hash=$1', [tokenHash]);
      return true;
    });
    result ? res.json({ message: 'Email verified. You can now sign in.' }) : res.status(400).json({ error: 'Verification link is invalid or expired' });
  }));

  app.post('/api/auth/resend-verification', wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (emailPattern.test(email)) {
      const { rows } = await query("SELECT id,role,email,verified FROM users WHERE email=$1 AND role IN ('buyer','seller')", [email]);
      if (rows[0] && !rows[0].verified) await sendToken(rows[0], 'verify');
    }
    res.json({ message: 'If the account needs verification, an email has been sent.' });
  }));

  app.post('/api/auth/login', wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = req.body?.role;
    const { rows } = await query('SELECT id,role,name,email,pass,verified FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user || !check(password, user.pass) || (role && role !== user.role)) return res.status(401).json({ error: 'Email or password is incorrect' });
    if (!user.verified && user.role !== 'admin') return res.status(403).json({ error: 'Verify your email before signing in', code: 'EMAIL_NOT_VERIFIED' });
    res.setHeader('Set-Cookie', sessionCookie(sign(user)));
    res.json({ user: safeUser(user) });
  }));

  app.post('/api/auth/logout', (_req,res) => { res.setHeader('Set-Cookie',`drawbay_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`); res.json({ok:true}); });

  app.post('/api/auth/forgot-password', wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (emailPattern.test(email)) {
      const { rows } = await query("SELECT id,role,email FROM users WHERE email=$1 AND role IN ('buyer','seller')", [email]);
      if (rows[0]) await sendToken(rows[0], 'reset');
    }
    res.json({ message: 'If an account exists, a password reset link has been sent.' });
  }));

  app.post('/api/auth/reset-password', wrap(async (req, res) => {
    const raw = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    if (password.length < 12 || password.length > 256) return bad(res, 'Use a password with at least 12 characters');
    if (raw.length < 30 || raw.length > 100) return bad(res, 'Reset link is invalid or expired');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const changed = await transaction(async client => {
      const token = await client.query("SELECT user_id FROM email_tokens WHERE token_hash=$1 AND purpose='reset' AND expires_at>now() FOR UPDATE", [tokenHash]);
      if (!token.rows[0]) return false;
      await client.query('UPDATE users SET pass=$1 WHERE id=$2', [hash(password), token.rows[0].user_id]);
      await client.query('DELETE FROM email_tokens WHERE user_id=$1', [token.rows[0].user_id]);
      return true;
    });
    changed ? res.json({ message: 'Password updated. You can now sign in.' }) : res.status(400).json({ error: 'Reset link is invalid or expired' });
  }));

  app.get('/api/me', need(), (req, res) => res.json(safeUser(req.user)));
  app.post('/api/auth/change-password', need('buyer','seller','admin'), wrap(async (req,res) => {
    const current=String(req.body?.currentPassword||''), next=String(req.body?.password||'');
    if(next.length<12||next.length>256)return bad(res,'Use a new password with at least 12 characters');
    const {rows}=await query('SELECT pass FROM users WHERE id=$1',[req.user.id]);
    if(!rows[0]||!check(current,rows[0].pass))return res.status(403).json({error:'Current password is incorrect'});
    await query('UPDATE users SET pass=$1 WHERE id=$2',[hash(next),req.user.id]);
    await query('INSERT INTO audit (who,what) VALUES ($1,$2)',[req.user.email,'Changed account password']);
    res.json({message:'Password updated.'});
  }));
}
