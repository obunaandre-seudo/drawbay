import crypto from 'node:crypto';
import { query, transaction, projectOut } from '../lib.js';
import { wrap, need, bad } from '../middleware.js';

const slugify = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'project';
const allowedEdit = ['title','desc','category','style','price','bedrooms','bathrooms','floors','img'];
async function payoutProvider(path, body) {
  if(!process.env.PAYSTACK_SECRET_KEY)throw Object.assign(new Error('Paystack is not configured'),{status:503});
  const response=await fetch(`https://api.paystack.co${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const result=await response.json();
  if(!response.ok||!result.status)throw Object.assign(new Error(result.message||'Payment provider request failed'),{status:502});
  return result.data;
}
const validateProject = b => {
  if (typeof b.title !== 'string' || b.title.trim().length < 4 || b.title.length > 160) return 'Title must be 4 to 160 characters';
  if (typeof b.desc !== 'string' || b.desc.trim().length < 40 || b.desc.length > 10000) return 'Description must be 40 to 10,000 characters';
  if (typeof b.category !== 'string' || b.category.length > 100 || typeof b.style !== 'string' || b.style.length > 100) return 'Choose a project category and style';
  if (!Number.isFinite(Number(b.price)) || Number(b.price) < 1000 || Number(b.price) > 1_000_000_000) return 'Price must be between ₦1,000 and ₦1,000,000,000';
  for (const k of ['bedrooms','bathrooms']) if (!Number.isInteger(Number(b[k])) || Number(b[k]) < 0 || Number(b[k]) > 100) return `Invalid ${k}`;
  if (!Number.isInteger(Number(b.floors)) || Number(b.floors) < 1 || Number(b.floors) > 100) return 'Floors must be between 1 and 100';
  if (typeof b.img !== 'string' || b.img.length > 1000) return 'Invalid preview image';
  return null;
};

export default function sellerRoutes(app) {
  app.get('/api/seller/projects', need('seller'), wrap(async (req,res) => {
    const { rows } = await query('SELECT * FROM projects WHERE seller_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows.map(projectOut));
  }));

  app.post('/api/seller/projects', need('seller'), wrap(async (req,res) => {
    const body = req.body || {};
    const issue = validateProject(body);
    if (issue) return bad(res, issue);
    const slug = `${slugify(body.title)}-${crypto.randomUUID().slice(0,8)}`;
    const { rows } = await query(`INSERT INTO projects (slug,title,description,category,style,price,bedrooms,bathrooms,floors,seller_id,img,files)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'[]'::jsonb) RETURNING *`,
    [slug,body.title.trim(),body.desc.trim(),body.category,body.style,Number(body.price),Number(body.bedrooms),Number(body.bathrooms),Number(body.floors),req.user.id,body.img || '']);
    res.status(201).json(projectOut(rows[0]));
  }));

  app.patch('/api/seller/projects/:id', need('seller'), wrap(async (req,res) => {
    const { rows } = await query('SELECT * FROM projects WHERE id=$1 AND seller_id=$2', [req.params.id,req.user.id]);
    const project = rows[0];
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!['draft','awaiting_fee','changes_requested','rejected'].includes(project.status)) return res.status(409).json({ error: 'This project cannot be edited in its current status' });
    const next = { ...project, desc:project.description, ...Object.fromEntries(allowedEdit.filter(k => k in (req.body || {})).map(k => [k,req.body[k]])) };
    const issue = validateProject(next);
    if (issue) return bad(res, issue);
    const { rows: updated } = await query(`UPDATE projects SET title=$1,description=$2,category=$3,style=$4,price=$5,bedrooms=$6,bathrooms=$7,floors=$8,img=$9,
      status=CASE WHEN fee_paid THEN 'changes_requested' ELSE 'awaiting_fee' END WHERE id=$10 AND seller_id=$11 RETURNING *`,
    [next.title,next.desc,next.category,next.style,Number(next.price),Number(next.bedrooms),Number(next.bathrooms),Number(next.floors),next.img,project.id,req.user.id]);
    res.json(projectOut(updated[0]));
  }));

  app.post('/api/seller/projects/:id/archive', need('seller'), wrap(async (req,res) => {
    const {rows}=await query("UPDATE projects SET status='archived' WHERE id=$1 AND seller_id=$2 AND status='published' RETURNING *",[req.params.id,req.user.id]);
    rows[0]?res.json(projectOut(rows[0])):res.status(409).json({error:'Only published projects can be archived'});
  }));

  app.post('/api/seller/projects/:id/upload-fee', need('seller'), (_req,res) => res.status(409).json({ error: 'Use the Paystack upload-fee checkout flow' }));

  app.post('/api/seller/projects/:id/submit', need('seller'), wrap(async (req,res) => {
    const result = await transaction(async client => {
      const { rows } = await client.query('SELECT * FROM projects WHERE id=$1 AND seller_id=$2 FOR UPDATE', [req.params.id,req.user.id]);
      const project = rows[0];
      if (!project) return { status:404,error:'Project not found' };
      if (!project.fee_paid) return { status:409,error:'Pay the listing fee before submitting' };
      if (!['awaiting_fee','changes_requested'].includes(project.status)) return { status:409,error:'Project is not ready for review' };
      const count = await client.query("SELECT kind,count(*)::int AS n FROM files WHERE project_id=$1 GROUP BY kind", [project.id]);
      const totals = Object.fromEntries(count.rows.map(x => [x.kind,x.n]));
      if (!totals.preview || !totals.deliverable) return { status:409,error:'Upload at least one preview and one project deliverable' };
      const updated = await client.query("UPDATE projects SET status='in_review',submitted_at=now() WHERE id=$1 RETURNING *", [project.id]);
      await client.query('INSERT INTO notifications (user_id,message) SELECT id,$1 FROM users WHERE role=\'admin\'', [`Project submitted for review: ${project.title}`]);
      return { project:projectOut(updated.rows[0]) };
    });
    result.error ? res.status(result.status).json({error:result.error}) : res.json(result.project);
  }));

  app.get('/api/seller/earnings', need('seller'), wrap(async (req,res) => {
    const { rows } = await query(`SELECT COALESCE(sum(amount),0) gross,COALESCE(sum(commission),0) commission FROM orders WHERE seller_id=$1 AND status='paid'`, [req.user.id]);
    const payouts = await query("SELECT status,COALESCE(sum(amount),0) amount FROM payouts WHERE seller_id=$1 GROUP BY status", [req.user.id]);
    const settings = (await query('SELECT processing_rate FROM settings WHERE id=true')).rows[0];
    const gross = Number(rows[0].gross), commission = Number(rows[0].commission), fees = gross * Number(settings.processing_rate);
    const payoutMap = Object.fromEntries(payouts.rows.map(p => [p.status,Number(p.amount)]));
    res.json({ gross,commission,fees,net:gross-commission-fees,pendingPayouts:payoutMap.pending||0,completedPayouts:payoutMap.completed||0 });
  }));

  app.get('/api/seller/orders', need('seller'), wrap(async (req,res) => {
    const { rows } = await query('SELECT * FROM orders WHERE seller_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows.map(o => ({id:o.id,buyerId:o.buyer_id,projectId:o.project_id,sellerId:o.seller_id,amount:Number(o.amount),commission:Number(o.commission),date:o.created_at.toISOString().slice(0,10),status:o.status})));
  }));

  app.get('/api/seller/payouts', need('seller'), wrap(async (req,res) => {
    const { rows } = await query('SELECT id,seller_id,amount,status,created_at FROM payouts WHERE seller_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows.map(p => ({id:p.id,sellerId:p.seller_id,amount:Number(p.amount),status:p.status,date:p.created_at.toISOString().slice(0,10)})));
  }));

  app.get('/api/seller/payout-account', need('seller'), wrap(async (req,res) => {
    const {rows}=await query('SELECT payout_bank,payout_account_name,payout_last4 FROM seller_profiles WHERE user_id=$1',[req.user.id]);
    res.json(rows[0]||{});
  }));
  app.get('/api/seller/banks', need('seller'), wrap(async (_req,res) => {
    const result=await payoutProvider('/bank?currency=NGN');
    res.json((result||[]).map(bank=>({name:bank.name,code:bank.code})));
  }));
  app.put('/api/seller/payout-account', need('seller'), wrap(async (req,res) => {
    const accountNumber=String(req.body?.accountNumber||''); const bankCode=String(req.body?.bankCode||'');
    if(!/^\d{10}$/.test(accountNumber)||!/^[a-zA-Z0-9_-]{2,20}$/.test(bankCode))return bad(res,'Enter a valid 10-digit Nigerian account number and bank');
    const recipient=await payoutProvider('/transferrecipient',{type:'nuban',name:req.user.name,account_number:accountNumber,bank_code:bankCode,currency:'NGN'});
    const last4=accountNumber.slice(-4); const bank=recipient.details?.bank_name||''; const accountName=recipient.name||req.user.name;
    await query('UPDATE seller_profiles SET payout_recipient_code=$1,payout_bank=$2,payout_bank_code=$3,payout_account_name=$4,payout_last4=$5 WHERE user_id=$6',
      [recipient.recipient_code,bank,bankCode,accountName,last4,req.user.id]);
    await query('INSERT INTO audit (who,what) VALUES ($1,$2)',[req.user.email,'Payout bank recipient updated']);
    res.json({bank,accountName,last4});
  }));
}
