import crypto from 'node:crypto';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { query, transaction, hash, check, sign, safeUser, log } from '../lib.js';
import { wrap, need, bad } from '../middleware.js';
import { issueToken } from '../mail.js';

const emailPattern = /^\S+@\S+\.\S+$/;
const baseUrl = () => process.env.APP_URL || 'http://localhost:5173';
const sessionCookie = token => `drawbay_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const sendToken = async (user, purpose) => issueToken({ query }, user.id, purpose, baseUrl(), user.email, user.role);
const portfolioBucket = () => process.env.S3_BUCKET;
let portfolioStorage;
function storage() {
  if (!portfolioBucket()) throw Object.assign(new Error('File storage is not configured'), { status: 503 });
  if (!portfolioStorage) portfolioStorage = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    } : undefined
  });
  return portfolioStorage;
}
const clean = (value, max = 500) => String(value || '').trim().slice(0, max);
const validUrl = value => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password; }
  catch { return false; }
};

export default function authRoutes(app) {
  app.post('/api/auth/seller-application/portfolio-url', wrap(async (req, res) => {
    const name = clean(req.body?.name, 150);
    const contentType = String(req.body?.contentType || '');
    const size = Number(req.body?.size);
    if (!name.toLowerCase().endsWith('.pdf') || contentType !== 'application/pdf' || !Number.isSafeInteger(size) || size < 1 || size > 10 * 1024 * 1024) {
      return bad(res, 'Choose a PDF file no larger than 10 MB');
    }
    const key = `seller-applications/${crypto.randomUUID()}.pdf`;
    const command = new PutObjectCommand({ Bucket: portfolioBucket(), Key: key, ContentType: 'application/pdf', ContentLength: size });
    res.json({
      key,
      method: 'PUT',
      url: await getSignedUrl(storage(), command, { expiresIn: 300 }),
      headers: { 'Content-Type': 'application/pdf' }
    });
  }));

  app.post('/api/auth/seller-application', wrap(async (req, res) => {
    const body = req.body || {};
    const firstName = clean(body.firstName, 60), lastName = clean(body.lastName, 60);
    const name = `${firstName} ${lastName}`.trim();
    const email = clean(body.email, 500).toLowerCase();
    const password = String(body.password || '');
    const phone = clean(body.phone, 40), country = clean(body.country, 100), city = clean(body.city, 100);
    const professionalTitle = clean(body.professionalTitle, 120), studio = clean(body.studio, 150);
    const yearsExperience = Number(body.yearsExperience);
    const registrationBody = clean(body.registrationBody, 150), licenseNumber = clean(body.licenseNumber, 100);
    const specializations = Array.isArray(body.specializations)
      ? [...new Set(body.specializations.map(value => clean(value, 80)).filter(Boolean))].slice(0, 12) : [];
    const bio = clean(body.bio, 5000), portfolioWebsite = clean(body.portfolioWebsite, 500), linkedinUrl = clean(body.linkedinUrl, 500);
    const portfolioObjectKey = clean(body.portfolioObjectKey, 200);
    if (!firstName || firstName.length > 60 || !lastName || lastName.length > 60 || !emailPattern.test(email) || email.length > 254 || !phone || !country || !city) {
      return bad(res, 'Complete your name, a valid email, phone number, country, and city');
    }
    if (!professionalTitle || !studio || !Number.isInteger(yearsExperience) || yearsExperience < 0 || yearsExperience > 80 || !specializations.length) {
      return bad(res, 'Complete your professional title, studio, experience, and specialization');
    }
    if (bio.length < 80 || !validUrl(portfolioWebsite) || !validUrl(linkedinUrl)) {
      return bad(res, 'Add a biography of at least 80 characters and valid HTTPS portfolio links');
    }
    if (password.length < 12 || password.length > 256) return bad(res, 'Use a password with at least 12 characters');
    if (body.confirmPassword !== password) return bad(res, 'Passwords do not match');
    if (body.declarationAccuracy !== true || body.declarationRights !== true || body.agreedTerms !== true) {
      return bad(res, 'Accept each professional declaration and the terms to submit your application');
    }
    if (portfolioObjectKey && !/^seller-applications\/[0-9a-f-]{36}\.pdf$/i.test(portfolioObjectKey)) {
      return bad(res, 'Portfolio PDF upload is invalid');
    }
    if (portfolioObjectKey) {
      let file;
      try { file = await storage().send(new HeadObjectCommand({ Bucket: portfolioBucket(), Key: portfolioObjectKey })); }
      catch (error) {
        if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return bad(res, 'Portfolio PDF upload could not be found');
        throw error;
      }
      if (file.ContentType !== 'application/pdf' || !file.ContentLength || file.ContentLength > 10 * 1024 * 1024) {
        return bad(res, 'Portfolio PDF did not pass validation');
      }
    }
    const user = await transaction(async client => {
      const { rows } = await client.query(
        'INSERT INTO users (role,name,email,pass,verified) VALUES (\'seller\',$1,$2,$3,true) ON CONFLICT (email) DO NOTHING RETURNING id,role,name,email',
        [name, email, hash(password)]
      );
      const created = rows[0];
      if (!created) return null;
      const slug = `${studio.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'studio'}-${created.id.slice(0,8)}`;
      await client.query(`INSERT INTO seller_profiles
        (user_id,slug,studio,bio,location,application_status,phone,country,city,professional_title,years_experience,
         registration_body,license_number,specializations,portfolio_website,linkedin_url,portfolio_object_key,declarations)
        VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [created.id,slug,studio,bio,`${city}, ${country}`,phone,country,city,professionalTitle,yearsExperience,
        registrationBody,licenseNumber,JSON.stringify(specializations),portfolioWebsite,linkedinUrl,portfolioObjectKey || null,
        JSON.stringify({ accuracy: true, rights: true, terms: true })]);
      await client.query('INSERT INTO notifications (user_id,message) SELECT id,$1 FROM users WHERE role=\'admin\'',
        [`New seller application submitted: ${name}`]);
      await log(email, 'Submitted seller application', client);
      return created;
    });
    if (!user) return res.status(409).json({ error: 'An account with that email already exists' });
    res.status(201).json({ message: 'Your application has been submitted for review. We’ll email you when a decision is made.' });
  }));

  app.get('/api/health', wrap(async (_, res) => {
    await query('SELECT 1');
    res.json({ ok: true, service: 'drawbay' });
  }));

  app.post('/api/auth/register', wrap(async (req, res) => {
    const role = req.body?.role;
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (role === 'seller') return bad(res, 'Complete the seller application to create a seller account');
    if (role !== 'buyer') return bad(res, 'Choose a buyer account');
    if (name.length < 2 || name.length > 120 || !emailPattern.test(email) || email.length > 254) return bad(res, 'Enter your name and a valid email');
    if (password.length < 12 || password.length > 256) return bad(res, 'Use a password with at least 12 characters');
    const { rows } = await query(
      'INSERT INTO users (role,name,email,pass,verified) VALUES ($1,$2,$3,$4,true) ON CONFLICT (email) DO NOTHING RETURNING id,role,name,email,verified',
      [role, name, email, hash(password)]
    );
    const user = rows[0];
    if (!user) return res.status(409).json({ error: 'An account with that email already exists' });
    await log(email, `Registered ${role} account`);
    res.status(201).json({ message: 'Account created. You can now sign in.' });
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
    res.json({ message: 'Email verification is not required. You can sign in.' });
  }));

  app.post('/api/auth/login', wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = req.body?.role;
    const { rows } = await query('SELECT id,role,name,email,pass,verified FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user || !check(password, user.pass) || (role && role !== user.role)) return res.status(401).json({ error: 'Email or password is incorrect' });
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
