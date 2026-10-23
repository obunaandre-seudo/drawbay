import crypto from 'node:crypto';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { query, transaction } from '../lib.js';
import { wrap, need, bad } from '../middleware.js';

let client;
const bucket = () => process.env.S3_BUCKET;
function storage() {
  if (!bucket()) throw Object.assign(new Error('File storage is not configured'), { status: 503 });
  if (!client) client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    } : undefined
  });
  return client;
}
const mimeAllowed = new Set(['application/pdf','application/zip','application/x-zip-compressed','application/octet-stream','application/acad','image/jpeg','image/png','image/webp']);
const cleanName = name => path.basename(String(name || 'file')).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150) || 'file';

export default function fileRoutes(app) {
  app.post('/api/seller/projects/:id/files/presign', need('seller'), wrap(async (req, res) => {
    const name = cleanName(req.body?.name);
    const contentType = String(req.body?.contentType || '');
    const size = Number(req.body?.size);
    const kind = req.body?.kind === 'preview' ? 'preview' : 'deliverable';
    if (!mimeAllowed.has(contentType) || !Number.isSafeInteger(size) || size < 1 || size > 200 * 1024 * 1024) return bad(res, 'File must be an allowed type and no larger than 200 MB');
    const { rows } = await query("SELECT id,status FROM projects WHERE id=$1 AND seller_id=$2", [req.params.id, req.user.id]);
    if (!rows[0] || !['draft','awaiting_fee','changes_requested','rejected'].includes(rows[0].status)) return res.status(404).json({ error: 'Project cannot accept uploads' });
    const key = `projects/${rows[0].id}/${crypto.randomUUID()}/${name}`;
    const command = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ContentLength: size });
    res.json({ method: 'PUT', url: await getSignedUrl(storage(), command, { expiresIn: 300 }), key, headers: { 'Content-Type': contentType } });
  }));

  app.post('/api/seller/projects/:id/files/complete', need('seller'), wrap(async (req, res) => {
    const key = String(req.body?.key || '');
    const displayName = cleanName(req.body?.name);
    const kind = req.body?.kind === 'preview' ? 'preview' : 'deliverable';
    const prefix = `projects/${req.params.id}/`;
    if (!key.startsWith(prefix) || key.length > 500) return bad(res, 'Invalid file key');
    const project = await query("SELECT id,files FROM projects WHERE id=$1 AND seller_id=$2 AND status IN ('draft','awaiting_fee','changes_requested','rejected')", [req.params.id, req.user.id]);
    if (!project.rows[0]) return res.status(404).json({ error: 'Project cannot accept uploads' });
    let head;
    try { head = await storage().send(new HeadObjectCommand({ Bucket: bucket(), Key: key })); }
    catch { return res.status(400).json({ error: 'Uploaded file could not be found' }); }
    if (!mimeAllowed.has(head.ContentType) || !head.ContentLength || head.ContentLength > 200 * 1024 * 1024) return bad(res, 'Uploaded file did not pass validation');
    const record = await transaction(async db => {
      const { rows } = await db.query('INSERT INTO files (project_id,object_key,display_name,content_type,size_bytes,kind) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (object_key) DO NOTHING RETURNING id,display_name,kind', [req.params.id, key, displayName, head.ContentType, head.ContentLength, kind]);
      const list = Array.isArray(project.rows[0].files) ? project.rows[0].files : [];
      if (!rows[0]) return null;
      await db.query('UPDATE projects SET files=$1 WHERE id=$2', [JSON.stringify([...list, rows[0].display_name]), req.params.id]);
      return {...rows[0],id:rows[0].id};
    });
    record ? res.status(201).json({...record,previewUrl:kind==='preview'?`/api/files/preview/${record.id}`:undefined}) : res.status(409).json({ error: 'File is already attached' });
  }));

  app.get('/api/projects/:slug/files', wrap(async (req, res) => {
    const { rows } = await query("SELECT f.display_name,f.kind,f.object_key FROM files f JOIN projects p ON p.id=f.project_id WHERE p.slug=$1 AND p.status='published' AND f.kind='preview'", [req.params.slug]);
    res.json(await Promise.all(rows.map(async f => ({ name: f.display_name, url: await getSignedUrl(storage(), new GetObjectCommand({ Bucket: bucket(), Key: f.object_key }), { expiresIn: 3600 }) }))));
  }));

  app.get('/api/files/preview/:id', wrap(async (req,res) => {
    const { rows } = await query("SELECT f.object_key,f.content_type FROM files f JOIN projects p ON p.id=f.project_id WHERE f.id=$1 AND f.kind='preview' AND p.status='published'", [req.params.id]);
    if (!rows[0]) return res.sendStatus(404);
    const object = await storage().send(new GetObjectCommand({Bucket:bucket(),Key:rows[0].object_key}));
    res.setHeader('Content-Type',rows[0].content_type);
    res.setHeader('Cache-Control','public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options','nosniff');
    object.Body.pipe(res);
  }));

  app.get('/api/orders/:id/downloads', need('buyer'), wrap(async (req, res) => {
    const order = await query("SELECT project_id FROM orders WHERE id=$1 AND buyer_id=$2 AND status='paid'", [req.params.id, req.user.id]);
    if (!order.rows[0]) return res.status(404).json({ error: 'Download not found' });
    const { rows } = await query("SELECT display_name,object_key FROM files WHERE project_id=$1 AND kind='deliverable'", [order.rows[0].project_id]);
    res.json(await Promise.all(rows.map(async f => ({ name: f.display_name, url: await getSignedUrl(storage(), new GetObjectCommand({ Bucket: bucket(), Key: f.object_key }), { expiresIn: 300 }) }))));
  }));
}
