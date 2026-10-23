import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import catalogueRoutes from './routes/catalogue.js';
import sellerRoutes from './routes/seller.js';
import buyerRoutes from './routes/buyer.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import fileRoutes from './routes/files.js';
import stateRoutes from './routes/state.js';
import contactRoutes from './routes/contact.js';
import { query } from './db.js';

export const app = express();
const originList=(process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean);
if(process.env.APP_URL)originList.push(new URL(process.env.APP_URL).origin);
const origins = new Set(originList);
const s3Origin = process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : 'https://*.amazonaws.com';
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    connectSrc: ["'self'",s3Origin], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"]
  } }, crossOriginEmbedderPolicy: false
}));
app.use((req, res, next) => cors({
  origin(origin, callback) {
    let sameOrigin = false;
    try { sameOrigin = !!origin && new URL(origin).origin === `${req.protocol}://${req.get('host')}`; } catch {}
    if (!origin || sameOrigin || origins.has(origin)) return callback(null, true);
    callback(new Error('Origin is not allowed'));
  },
  credentials: false
})(req, res, next));
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    const diagnosticCode = typeof error?.code === 'string' ? error.code : error?.name;
    res.status(503).json({ status: 'unavailable', ...(diagnosticCode ? { diagnosticCode } : {}) });
  }
});
app.get('/robots.txt', (req, res) => {
  const base = new URL(process.env.APP_URL || `${req.protocol}://${req.get('host')}`).origin;
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /buyer/\nDisallow: /seller/\nDisallow: /checkout\nDisallow: /cart\nDisallow: /wishlist\nSitemap: ${base}/sitemap.xml\n`
  );
});
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const base = new URL(process.env.APP_URL || `${req.protocol}://${req.get('host')}`).origin;
    const links = [
      '/', '/marketplace', '/projects', '/about', '/faq', '/contact',
      '/terms', '/privacy', '/refund-policy', '/seller-agreement'
    ].map(path => ({ path }));
    const [projects, sellers, categories] = await Promise.all([
      query("SELECT slug, created_at FROM projects WHERE status='published' AND slug<>'' ORDER BY created_at DESC LIMIT 50000"),
      query("SELECT DISTINCT sp.slug FROM seller_profiles sp JOIN projects p ON p.seller_id=sp.user_id AND p.status='published' WHERE sp.slug<>'' LIMIT 50000"),
      query('SELECT name FROM categories ORDER BY name')
    ]);
    const slugify = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    for (const row of categories.rows) {
      const slug = slugify(row.name);
      if (slug) links.push({ path: `/categories/${slug}` });
    }
    for (const row of sellers.rows) links.push({ path: `/sellers/${encodeURIComponent(row.slug)}` });
    for (const row of projects.rows) {
      links.push({ path: `/projects/${encodeURIComponent(row.slug)}`, date: row.created_at });
    }
    const xml = links.map(({ path, date }) => {
      const lastmod = date ? `<lastmod>${new Date(date).toISOString().slice(0, 10)}</lastmod>` : '';
      return `<url><loc>${base}${path}</loc>${lastmod}</url>`;
    }).join('');
    res.type('application/xml').set('Cache-Control', 'public, max-age=300')
      .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xml}</urlset>`);
  } catch (error) { next(error); }
});
app.use('/api/payments/paystack/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '256kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/contact', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }));

authRoutes(app);
catalogueRoutes(app);
sellerRoutes(app);
buyerRoutes(app);
adminRoutes(app);
paymentRoutes(app);
fileRoutes(app);
stateRoutes(app);
contactRoutes(app);

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../../dist');
app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders(res, file) { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('*', (req, res, next) => req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html'), err => err && next()) : next());
app.use((e, _req, res, _next) => {
  console.error(e);
  if (res.headersSent) return;
  if (e.message === 'Origin is not allowed') return res.status(403).json({ error: e.message });
  res.status(e.status || 500).json({ error: e.status && e.status < 500 ? e.message : 'Server error' });
});
