import { query, transaction, orderOut } from '../lib.js';
import { wrap, need, bad } from '../middleware.js';

export default function buyerRoutes(app) {
  app.get('/api/orders', need('buyer'), wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM orders WHERE buyer_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows.map(orderOut));
  }));

  app.put('/api/cart', need('buyer'), wrap(async (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length > 50) return bad(res, 'Cart must contain no more than 50 items');
    const quantities = new Map();
    for (const item of items) {
      const projectId = String(item?.id || item?.projectId || '');
      const qty = Number(item?.qty);
      if (!/^[0-9a-f-]{36}$/i.test(projectId) || !Number.isInteger(qty) || qty < 1 || qty > 99) return bad(res, 'Invalid cart item');
      quantities.set(projectId, qty);
    }
    const ids = [...quantities.keys()];
    const { rows } = ids.length ? await query("SELECT id FROM projects WHERE id=ANY($1::uuid[]) AND status='published'", [ids]) : { rows: [] };
    if (rows.length !== ids.length) return res.status(409).json({ error: 'Cart contains an unavailable project' });
    await transaction(async client => {
      await client.query('DELETE FROM cart_items WHERE buyer_id=$1', [req.user.id]);
      for (const [projectId, qty] of quantities) await client.query('INSERT INTO cart_items (buyer_id,project_id,qty) VALUES ($1,$2,$3)', [req.user.id,projectId,qty]);
    });
    res.json({ items: [...quantities].map(([id,qty]) => ({ id,qty })) });
  }));

  app.post('/api/wishlist/:projectId/toggle', need('buyer'), wrap(async (req, res) => {
    const project = await query("SELECT id FROM projects WHERE id=$1 AND status='published'", [req.params.projectId]);
    if (!project.rows[0]) return res.status(404).json({ error: 'Project not found' });
    const result = await query('DELETE FROM wishlist_items WHERE buyer_id=$1 AND project_id=$2 RETURNING project_id', [req.user.id,req.params.projectId]);
    if (!result.rowCount) await query('INSERT INTO wishlist_items (buyer_id,project_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id,req.params.projectId]);
    const { rows } = await query('SELECT project_id FROM wishlist_items WHERE buyer_id=$1', [req.user.id]);
    res.json({ wishlist: rows.map(r => r.project_id) });
  }));

  app.patch('/api/profile', need('buyer','seller','admin'), wrap(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (name.length < 2 || name.length > 120) return bad(res, 'Name must be 2 to 120 characters');
    let studio,bio,location;
    if (req.user.role === 'seller') {
      studio=String(req.body?.studio||`${name} Studio`).trim(); bio=String(req.body?.bio||'').trim(); location=String(req.body?.location||'').trim();
      if(studio.length<2||studio.length>160||bio.length>5000||location.length>160)return bad(res,'Invalid seller profile details');
    }
    const rows=await transaction(async client=>{
      const result=await client.query('UPDATE users SET name=$1 WHERE id=$2 RETURNING id,role,name,email,verified',[name,req.user.id]);
      if(studio!==undefined)await client.query('UPDATE seller_profiles SET studio=$1,bio=$2,location=$3 WHERE user_id=$4',[studio,bio,location,req.user.id]);
      return result.rows;
    });
    res.json(rows[0]);
  }));

  app.post('/api/support', need('buyer','seller'), wrap(async (req, res) => {
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    if (subject.length < 4 || subject.length > 160 || message.length < 10 || message.length > 5000) return bad(res, 'Add a subject and message (10–5000 characters)');
    const { rows } = await query('INSERT INTO support_tickets (user_id,subject,message) VALUES ($1,$2,$3) RETURNING id,subject,status,created_at', [req.user.id,subject,message]);
    res.status(201).json(rows[0]);
  }));

  // A paid order can only be created through verified Paystack checkout.
  app.post('/api/orders', need('buyer'), (_req, res) => res.status(409).json({ error: 'Start checkout through /api/payments/checkout' }));
}
