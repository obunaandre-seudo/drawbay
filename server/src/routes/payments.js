import crypto from 'node:crypto';
import { query, transaction, log } from '../lib.js';
import { wrap, need, bad } from '../middleware.js';

const paystackKey = () => process.env.PAYSTACK_SECRET_KEY;
const newReference = () => `drawbay_${crypto.randomUUID().replaceAll('-', '')}`;
const nairaToMinor = value => Math.round(Number(value) * 100);
async function paystack(path, options = {}) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_COMMERCE !== 'true') throw Object.assign(new Error('Checkout has not been enabled for this deployment'), { status: 503 });
  if (!paystackKey()) throw Object.assign(new Error('Card payments are not configured'), { status: 503 });
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${paystackKey()}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json();
  if (!response.ok || !body.status) throw Object.assign(new Error('Payment provider could not process this request'), { status: 502 });
  return body.data;
}

async function initializePayment({ user, purpose, amount, projectId = null, metadata = {} }) {
  const reference = newReference();
  const amountMinor = nairaToMinor(amount);
  const root = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  const callback = purpose === 'upload_fee'
    ? `${root}/seller/upload-payment/success?project=${encodeURIComponent(projectId)}`
    : `${root}/checkout/success`;
  await query('INSERT INTO payments (reference,user_id,purpose,project_id,amount_minor,metadata) VALUES ($1,$2,$3,$4,$5,$6)',
    [reference, user.id, purpose, projectId, amountMinor, metadata]);
  try {
    const result = await paystack('/transaction/initialize', { method: 'POST', body: JSON.stringify({
      email: user.email, amount: amountMinor, currency: 'NGN', reference, callback_url: callback,
      metadata: { drawbayPaymentId: reference, purpose }
    }) });
    await query('UPDATE payments SET checkout_url=$1 WHERE reference=$2', [result.authorization_url, reference]);
    return { reference, authorizationUrl: result.authorization_url, accessCode: result.access_code };
  } catch (error) {
    await query("UPDATE payments SET status='failed' WHERE reference=$1", [reference]);
    throw error;
  }
}

async function fulfill(reference) {
  const verified = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
  const existing = await query('SELECT * FROM payments WHERE reference=$1', [reference]);
  const payment = existing.rows[0];
  if (!payment) return { error: 'Payment reference not found', status: 404 };
  if (verified.reference !== reference || verified.currency !== payment.currency || Number(verified.amount) !== Number(payment.amount_minor))
    return { error: 'Payment details did not match the order', status: 400 };
  if (verified.status !== 'success') return { error: 'Payment has not completed', status: 409 };

  const result = await transaction(async client => {
    const locked = await client.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE', [payment.id]);
    const current = locked.rows[0];
    if (current.status === 'success') return { payment: current, orders: (await client.query('SELECT * FROM orders WHERE payment_id=$1 ORDER BY created_at', [current.id])).rows };
    const updated = await client.query("UPDATE payments SET status='success',paid_at=now() WHERE id=$1 RETURNING *", [current.id]);
    if (current.purpose === 'upload_fee') {
      await client.query("UPDATE projects SET fee_paid=true,status='awaiting_fee' WHERE id=$1 AND seller_id=$2", [current.project_id, current.user_id]);
      await log(current.user_id, `Paid upload fee for project ${current.project_id}`, client);
      return { payment: updated.rows[0], orders: [] };
    }
    const items = Array.isArray(current.metadata?.items) ? current.metadata.items : [];
    for (const item of items) {
      await client.query(`INSERT INTO orders (payment_id,buyer_id,project_id,seller_id,amount,commission)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (payment_id,project_id) DO NOTHING`,
      [current.id, current.user_id, item.projectId, item.sellerId, item.unitPrice * item.qty, item.unitPrice * item.qty * Number(current.metadata?.commissionRate ?? 0.15)]);
    }
    await client.query('DELETE FROM cart_items WHERE buyer_id=$1 AND project_id=ANY($2::uuid[])', [current.user_id, items.map(x => x.projectId)]);
    await client.query('INSERT INTO notifications (user_id,message) VALUES ($1,$2)',[current.user_id,'Your project purchase is confirmed. Download your files from Purchases.']);
    for(const sellerId of new Set(items.map(item=>item.sellerId)))await client.query('INSERT INTO notifications (user_id,message) VALUES ($1,$2)',[sellerId,'You made a sale on Guaranteed Impressions. View your seller dashboard for details.']);
    await log(current.user_id, `Verified order payment ${reference}`, client);
    return { payment: updated.rows[0], orders: (await client.query('SELECT * FROM orders WHERE payment_id=$1 ORDER BY created_at', [current.id])).rows };
  });
  return result;
}

export default function paymentRoutes(app) {
  app.post('/api/payments/checkout', need('buyer'), wrap(async (req, res) => {
    const input = req.body?.items;
    if (!Array.isArray(input) || input.length < 1 || input.length > 50) return bad(res, 'Choose at least one project');
    const quantities = new Map();
    for (const item of input) {
      const projectId = String(item?.projectId || item?.id || '');
      const qty = Number(item?.qty || 1);
      if (!/^[0-9a-f-]{36}$/i.test(projectId) || !Number.isInteger(qty) || qty < 1 || qty > 99) return bad(res, 'Cart contains an invalid item');
      quantities.set(projectId, (quantities.get(projectId) || 0) + qty);
    }
    const { rows } = await query('SELECT id,seller_id,price FROM projects WHERE status=\'published\' AND id=ANY($1::uuid[])', [[...quantities.keys()]]);
    if (rows.length !== quantities.size) return res.status(409).json({ error: 'A project in your cart is no longer available' });
    const items = rows.map(p => ({ projectId: p.id, sellerId: p.seller_id, unitPrice: Number(p.price), qty: quantities.get(p.id) }));
    const amount = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const settings=(await query('SELECT commission_rate FROM settings WHERE id=true')).rows[0];
    res.status(201).json(await initializePayment({ user: req.user, purpose: 'checkout', amount, metadata: { items,commissionRate:Number(settings.commission_rate) } }));
  }));

  app.post('/api/seller/projects/:id/upload-fee/checkout', need('seller'), wrap(async (req, res) => {
    const { rows } = await query("SELECT id,title,status,fee_paid FROM projects WHERE id=$1 AND seller_id=$2", [req.params.id, req.user.id]);
    const project = rows[0];
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.fee_paid) return res.status(409).json({ error: 'Upload fee has already been paid' });
    if (!['awaiting_fee','payment_pending'].includes(project.status)) return res.status(409).json({ error: 'Project is not ready for upload-fee payment' });
    const setting = (await query('SELECT upload_fee FROM settings WHERE id=true')).rows[0];
    const payment = await initializePayment({ user: req.user, purpose: 'upload_fee', amount: setting.upload_fee, projectId: project.id, metadata: { projectId: project.id } });
    res.status(201).json(payment);
  }));

  app.get('/api/payments/verify/:reference', need('buyer','seller'), wrap(async (req, res) => {
    const { rows } = await query('SELECT id,user_id FROM payments WHERE reference=$1', [req.params.reference]);
    const payment = rows[0];
    if (!payment || payment.user_id !== req.user.id) return res.status(404).json({ error: 'Payment not found' });
    const result = await fulfill(req.params.reference);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json({ status: result.payment.status, purpose:result.payment.purpose, orders: result.orders });
  }));

  app.post('/api/payments/paystack/webhook', wrap(async (req, res) => {
    const secret = paystackKey();
    if (!secret || !Buffer.isBuffer(req.body)) return res.sendStatus(400);
    const signature = String(req.headers['x-paystack-signature'] || '');
    const expected = crypto.createHmac('sha512', secret).update(req.body).digest();
    let supplied;
    try { supplied = Buffer.from(signature, 'hex'); } catch { return res.sendStatus(401); }
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return res.sendStatus(401);
    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'charge.success' && event.data?.reference) {
      const checked = await fulfill(String(event.data.reference));
      if (checked.error && checked.status !== 404) return res.status(500).json({ error: 'Payment verification will be retried' });
    }
    if (['transfer.success','transfer.failed','transfer.reversed'].includes(event.event) && event.data?.reference) {
      const status=event.event==='transfer.success'?'completed':'failed';
      await transaction(async client=>{
        const allowed=event.event==='transfer.reversed'?"status IN ('processing','completed')":"status='processing'";
        const {rows}=await client.query(`UPDATE payouts SET status=$1,failure_reason=$2 WHERE transfer_reference=$3 AND ${allowed} RETURNING seller_id,id`,
          [status,status==='failed'?String(event.data.reason||event.event).slice(0,500):null,String(event.data.reference)]);
        if(rows[0]){
          await client.query('INSERT INTO notifications (user_id,message) VALUES ($1,$2)',[rows[0].seller_id,status==='completed'?'Your seller payout has been sent.':'Your seller payout did not complete. Contact Guaranteed Impressions support.']);
          await client.query('INSERT INTO audit (who,what) VALUES ($1,$2)',['Paystack webhook',`Payout ${rows[0].id} ${status}`]);
        }
      });
    }
    const refundStatuses={'refund.pending':'pending','refund.processing':'processing','refund.needs-attention':'needs-attention','refund.failed':'failed','refund.processed':'processed'};
    if(refundStatuses[event.event]&&event.data?.id){
      const status=refundStatuses[event.event];
      await transaction(async client=>{
        const {rows}=await client.query(`UPDATE refunds SET status=$1,updated_at=now() WHERE provider_id=$2 RETURNING order_id,payment_id`,[status,String(event.data.id)]);
        if(rows[0]&&status==='processed'){
          await client.query("UPDATE orders SET status='refunded' WHERE id=$1",[rows[0].order_id]);
          await client.query('INSERT INTO audit (who,what) VALUES ($1,$2)',['Paystack webhook',`Refund processed for order ${rows[0].order_id}`]);
        }
      });
    }
    res.sendStatus(200);
  }));
}
