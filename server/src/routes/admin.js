import { query, transaction, projectOut, orderOut, log } from '../lib.js';
import { wrap, need, bad } from '../middleware.js';

export default function adminRoutes(app) {
  app.get('/api/admin/stats', need('admin'), wrap(async (_req,res) => {
    const { rows } = await query(`SELECT
      (SELECT count(*) FROM users)::int users,
      (SELECT count(*) FROM users WHERE role='buyer')::int buyers,
      (SELECT count(*) FROM users WHERE role='seller')::int sellers,
      (SELECT count(*) FROM projects WHERE status='published')::int published,
      (SELECT count(*) FROM projects WHERE status='in_review')::int "pendingReviews",
      (SELECT count(*) FROM projects WHERE status='in_review')::int pending,
      (SELECT COALESCE(sum(amount),0) FROM orders WHERE status='paid') sales,
      (SELECT COALESCE(sum(amount),0) FROM payments WHERE purpose='upload_fee' AND status='success') "uploadFeeRevenue",
      (SELECT COALESCE(sum(amount),0) FROM payments WHERE purpose='upload_fee' AND status='success') "uploadRevenue",
      (SELECT COALESCE(sum(amount),0) FROM payouts WHERE status IN ('pending','processing')) "pendingPayouts",
      (SELECT COALESCE(sum(commission),0) FROM orders WHERE status='paid') commissions`);
    const stats = rows[0];
    for (const key of ['sales','uploadFeeRevenue','uploadRevenue','commissions','pendingPayouts']) stats[key] = Number(stats[key]);
    res.json(stats);
  }));

  app.get('/api/admin/reviews', need('admin'), wrap(async (_req,res) => {
    const { rows } = await query("SELECT * FROM projects WHERE status='in_review' ORDER BY submitted_at");
    res.json(rows.map(projectOut));
  }));

  app.post('/api/admin/projects/:id/approve', need('admin'), wrap(async (req,res) => {
    const result = await transaction(async client => {
      const { rows } = await client.query("UPDATE projects SET status='published',feedback=NULL WHERE id=$1 AND status='in_review' RETURNING *", [req.params.id]);
      if (!rows[0]) return null;
      await client.query('INSERT INTO notifications (user_id,message) VALUES ($1,$2)', [rows[0].seller_id,`Your project “${rows[0].title}” is now published.`]);
      await log(req.user.email,`Approved ${rows[0].id}`,client);
      return rows[0];
    });
    result ? res.json(projectOut(result)) : bad(res,'Project is not awaiting review');
  }));

  app.post('/api/admin/projects/:id/reject', need('admin'), wrap(async (req,res) => {
    const reason = String(req.body?.reason || '').trim();
    const changes = !!req.body?.changesRequested;
    if (reason.length < 5 || reason.length > 2000) return bad(res,'Add a review reason (5–2000 characters)');
    const status = changes ? 'changes_requested' : 'rejected';
    const result = await transaction(async client => {
      const { rows } = await client.query('UPDATE projects SET status=$1,feedback=$2 WHERE id=$3 AND status=\'in_review\' RETURNING *',[status,reason,req.params.id]);
      if (!rows[0]) return null;
      await client.query('INSERT INTO notifications (user_id,message) VALUES ($1,$2)',[rows[0].seller_id,`Review update for “${rows[0].title}”: ${status.replace('_',' ')}.`]);
      await log(req.user.email,`${status} ${rows[0].id}`,client);
      return rows[0];
    });
    result ? res.json(projectOut(result)) : bad(res,'Project is not awaiting review');
  }));

  app.get('/api/admin/projects', need('admin'), wrap(async (_req,res) => { const { rows }=await query('SELECT * FROM projects ORDER BY created_at DESC'); res.json(rows.map(projectOut)); }));
  app.get('/api/admin/upload-fees', need('admin'), wrap(async (_req,res) => {
    const {rows}=await query(`SELECT p.reference,p.amount_minor,p.status,p.created_at,u.email,pr.title AS project
      FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN projects pr ON pr.id=p.project_id
      WHERE p.purpose='upload_fee' ORDER BY p.created_at DESC`);
    res.json(rows.map(p=>({id:p.reference,amount:Number(p.amount_minor)/100,status:p.status,date:p.created_at.toISOString().slice(0,10),seller:p.email,project:p.project||'Removed project'})));
  }));
  app.patch('/api/admin/projects/:id', need('admin'), wrap(async (req,res) => {
    if (typeof req.body?.featured !== 'boolean') return bad(res,'Only the featured setting can be changed here');
    const {rows}=await query('UPDATE projects SET featured=$1 WHERE id=$2 AND status=\'published\' RETURNING *',[req.body.featured,req.params.id]);
    rows[0]?res.json(projectOut(rows[0])):res.status(404).json({error:'Published project not found'});
  }));
  app.get('/api/admin/orders', need('admin'), wrap(async (_req,res) => { const { rows }=await query('SELECT * FROM orders ORDER BY created_at DESC'); res.json(rows.map(orderOut)); }));
  app.post('/api/admin/orders/:id/refund', need('admin'), wrap(async (req,res) => {
    if(process.env.NODE_ENV==='production'&&process.env.ENABLE_COMMERCE!=='true')return res.status(503).json({error:'Commerce is not enabled for this deployment'});
    if(!process.env.PAYSTACK_SECRET_KEY)return res.status(503).json({error:'Refunds are not configured for this deployment'});
    const reason=String(req.body?.reason||'').trim();
    if(reason.length<5||reason.length>500)return bad(res,'Add a refund reason (5–500 characters)');
    const {rows}=await query(`SELECT o.id,o.payment_id,o.amount,o.status,p.reference FROM orders o JOIN payments p ON p.id=o.payment_id WHERE o.id=$1`,[req.params.id]);
    const order=rows[0]; if(!order)return res.status(404).json({error:'Order not found'});
    if(order.status!=='paid')return res.status(409).json({error:'Only paid orders can be refunded'});
    const reservation=await transaction(async client=>{
      const ins=await client.query(`INSERT INTO refunds(order_id,payment_id,amount_minor,reason) VALUES($1,$2,$3,$4) ON CONFLICT(order_id) DO NOTHING RETURNING id`,[order.id,order.payment_id,Math.round(Number(order.amount)*100),reason]);
      if(!ins.rows[0])return null;
      await log(req.user.email,`Refund requested for order ${order.id}: ${reason}`,client);
      return ins.rows[0];
    });
    if(!reservation)return res.status(409).json({error:'A refund has already been requested for this order'});
    try{
      const response=await fetch('https://api.paystack.co/refund',{method:'POST',headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({transaction:order.reference,amount:Math.round(Number(order.amount)*100),merchant_note:reason})});
      const body=await response.json(); if(!response.ok||!body.status)throw new Error(body.message||'Provider rejected the refund request');
      await query(`UPDATE refunds SET provider_id=$1,status=$2,updated_at=now() WHERE id=$3`,[String(body.data.id),['pending','processing','needs-attention','processed','failed'].includes(body.data.status)?body.data.status:'pending',reservation.id]);
      return res.status(202).json({id:reservation.id,status:body.data.status||'pending'});
    }catch(error){
      await log(req.user.email,`Refund request failed for order ${order.id}: ${String(error.message).slice(0,300)}`);
      return res.status(202).json({id:reservation.id,status:'pending',message:'Refund request is being reconciled. Check Paystack before taking further action.'});
    }
  }));
  app.get('/api/admin/payouts', need('admin'), wrap(async (_req,res) => { const { rows }=await query('SELECT id,seller_id,amount,status,created_at FROM payouts ORDER BY created_at DESC'); res.json(rows.map(p=>({id:p.id,sellerId:p.seller_id,amount:Number(p.amount),status:p.status,date:p.created_at.toISOString().slice(0,10)}))); }));
  app.get('/api/admin/audit', need('admin'), wrap(async (_req,res) => { const { rows }=await query("SELECT to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS when,who,what FROM audit ORDER BY id DESC LIMIT 1000"); res.json(rows); }));
  app.get('/api/admin/users', need('admin'), wrap(async (_req,res) => { const { rows }=await query('SELECT id,name,email,role,verified,created_at FROM users ORDER BY created_at DESC'); res.json(rows); }));
  app.get('/api/admin/settings', need('admin'), wrap(async (_req,res) => { const { rows }=await query('SELECT commission_rate,processing_rate,upload_fee FROM settings WHERE id=true'); const s=rows[0]; res.json({commissionRate:Number(s.commission_rate),processingRate:Number(s.processing_rate),uploadFee:Number(s.upload_fee)}); }));
  app.put('/api/admin/categories', need('admin'), wrap(async (req,res) => {
    const names=[...new Set((Array.isArray(req.body?.categories)?req.body.categories:[]).map(x=>String(x).trim()).filter(x=>x.length>=2&&x.length<=100))];
    if(!names.length||names.length>100)return bad(res,'Keep between 1 and 100 valid categories');
    await transaction(async client=>{
      await client.query('DELETE FROM categories WHERE name <> ALL($1::text[])',[names]);
      for(const name of names)await client.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING',[name]);
      await log(req.user.email,'Marketplace categories updated',client);
    });
    res.json({categories:names});
  }));

  app.put('/api/admin/settings', need('admin'), wrap(async (req,res) => {
    const commissionRate = Number(req.body?.commissionRate), processingRate = Number(req.body?.processingRate), uploadFee = Number(req.body?.uploadFee);
    if (!(commissionRate >= 0 && commissionRate < 1) || !(processingRate >= 0 && processingRate < 1) || !(uploadFee >= 0 && uploadFee <= 1_000_000_000)) return bad(res,'Invalid settings');
    await query('UPDATE settings SET commission_rate=$1,processing_rate=$2,upload_fee=$3 WHERE id=true',[commissionRate,processingRate,uploadFee]);
    await log(req.user.email,'Settings changed');
    res.json({commissionRate,processingRate,uploadFee});
  }));

  app.post('/api/admin/payouts', need('admin'), wrap(async (req,res) => {
    const sellerId = String(req.body?.sellerId || ''), amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return bad(res,'Payout amount must be positive');
    const result = await transaction(async client => {
      const seller = await client.query("SELECT u.id,sp.payout_recipient_code FROM users u JOIN seller_profiles sp ON sp.user_id=u.id WHERE u.id=$1 AND u.role='seller' FOR UPDATE OF u",[sellerId]);
      if (!seller.rows[0]) return { error:'Seller not found',status:404 };
      if (!seller.rows[0].payout_recipient_code) return { error:'Seller must add and verify a payout account first',status:409 };
      const balance = await client.query(`SELECT COALESCE(sum(o.amount-o.commission-o.amount*s.processing_rate),0)
        - COALESCE((SELECT sum(p.amount) FROM payouts p WHERE p.seller_id= AND p.status IN ('pending','processing','completed')$1),0) AS available
        FROM orders o CROSS JOIN settings s WHERE o.seller_id=$1 AND o.status='paid' AND s.id=true`,[sellerId]);
      if (amount > Number(balance.rows[0].available)) return { error:'Payout is larger than the available seller balance',status:409 };
      const payout = await client.query("INSERT INTO payouts (seller_id,amount,status) VALUES ($1,$2,'pending') RETURNING id,seller_id,amount,status,created_at",[sellerId,amount]);
      await log(req.user.email,'Payout request recorded; transfer must be completed through the configured payout provider',client);
      return { payout:payout.rows[0] };
    });
    if(result.error) return res.status(result.status).json({error:result.error});
    const p=result.payout; res.status(201).json({id:p.id,sellerId:p.seller_id,amount:Number(p.amount),status:p.status,date:p.created_at.toISOString().slice(0,10)});
  }));

  app.post('/api/admin/payouts/:id/send', need('admin'), wrap(async (req,res) => {
    if(process.env.NODE_ENV==='production'&&process.env.ENABLE_COMMERCE!=='true')return res.status(503).json({error:'Commerce and payouts are not enabled for this deployment'});
    const payout=await transaction(async client=>{
      const {rows}=await client.query('SELECT p.*,sp.payout_recipient_code FROM payouts p JOIN seller_profiles sp ON sp.user_id=p.seller_id WHERE p.id=$1 FOR UPDATE OF p',[req.params.id]);
      if(!rows[0])return {error:'Payout not found',status:404};
      if(rows[0].status!=='pending')return {error:`Payout is ${rows[0].status}`,status:409};
      if(!rows[0].payout_recipient_code)return {error:'Seller payout account is missing',status:409};
      const reference=`drawbay_transfer_${rows[0].id.replaceAll('-','')}`;
      const updated=await client.query("UPDATE payouts SET status='processing',transfer_reference=$1 WHERE id=$2 RETURNING *",[reference,rows[0].id]);
      return {payout:updated.rows[0],recipient:rows[0].payout_recipient_code};
    });
    if(payout.error)return res.status(payout.status).json({error:payout.error});
    try{
      if(!process.env.PAYSTACK_SECRET_KEY)throw new Error('Paystack is not configured');
      const response=await fetch('https://api.paystack.co/transfer',{method:'POST',headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({source:'balance',amount:Math.round(Number(payout.payout.amount)*100),recipient:payout.recipient,reference:payout.payout.transfer_reference,reason:`DrawBay seller payout ${payout.payout.id}`})});
      const body=await response.json();
      if(!response.ok||!body.status)throw new Error(body.message||'Transfer request was not accepted');
      await query('UPDATE payouts SET transfer_code=$1 WHERE id=$2',[body.data.transfer_code,payout.payout.id]);
      await log(req.user.email,`Paystack transfer started for payout ${payout.payout.id}`);
      return res.status(202).json({id:payout.payout.id,status:'processing',reference:payout.payout.transfer_reference});
    }catch(error){
      // A network failure may occur after the provider accepted the reference; keep it processing for safe reconciliation.
      await log(req.user.email,`Payout ${payout.payout.id} needs transfer reconciliation: ${error.message}`);
      return res.status(202).json({id:payout.payout.id,status:'processing',reference:payout.payout.transfer_reference,message:'Transfer is being reconciled. Do not start another payout.'});
    }
  }));

  app.patch('/api/admin/payouts/:id/complete', need('admin'), (_req,res) => res.status(409).json({error:'Payout completion is controlled by Paystack transfer webhooks'}));

  app.get('/api/admin/support', need('admin'), wrap(async (_req,res) => { const { rows }=await query(`SELECT * FROM (
    SELECT t.id,u.name AS from,t.subject,t.status,t.message,t.created_at FROM support_tickets t JOIN users u ON u.id=t.user_id
    UNION ALL SELECT id,email AS from,'Website contact' AS subject,'open' AS status,message,created_at FROM contact_messages
  ) messages ORDER BY created_at DESC`); res.json(rows); }));
}
