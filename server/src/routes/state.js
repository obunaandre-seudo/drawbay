import { query, projectOut, orderOut, safeUser } from '../lib.js';
import { wrap, need } from '../middleware.js';

export default function stateRoutes(app) {
  app.get('/api/app/state', need(), wrap(async (req, res) => {
    const user = req.user;
    const isAdmin = user.role === 'admin';
    const isSeller = user.role === 'seller';
    const projectSql = isAdmin ? 'SELECT * FROM projects ORDER BY created_at DESC' : isSeller
      ? "SELECT * FROM projects WHERE status='published' OR seller_id=$1 ORDER BY created_at DESC"
      : "SELECT * FROM projects WHERE status='published' ORDER BY created_at DESC";
    const projectParams = isSeller ? [user.id] : [];
    const orderSql = isAdmin ? 'SELECT * FROM orders ORDER BY created_at DESC' : isSeller
      ? 'SELECT * FROM orders WHERE seller_id=$1 ORDER BY created_at DESC' : 'SELECT * FROM orders WHERE buyer_id=$1 ORDER BY created_at DESC';
    const [projects, sellers, buyers, orders, payouts, settings, wishlist, cart, audit, notifications, support, categories] = await Promise.all([
      query(projectSql, projectParams),
      query(`SELECT u.id,u.name,${isAdmin ? 'u.email' : "'' AS email"},u.verified,sp.slug,sp.studio,sp.bio,sp.location,sp.verified AS studio_verified
        FROM users u LEFT JOIN seller_profiles sp ON sp.user_id=u.id WHERE u.role='seller' ORDER BY u.created_at DESC`),
      query(isAdmin ? "SELECT id,name,email,to_char(created_at,'YYYY-MM-DD') AS joined FROM users WHERE role='buyer' ORDER BY created_at DESC" : 'SELECT 1 WHERE false'),
      query(orderSql, isAdmin ? [] : [user.id]),
      query(isAdmin ? 'SELECT * FROM payouts ORDER BY created_at DESC' : isSeller ? 'SELECT * FROM payouts WHERE seller_id=$1 ORDER BY created_at DESC' : 'SELECT * FROM payouts WHERE false', isSeller ? [user.id] : []),
      query('SELECT commission_rate,processing_rate,upload_fee FROM settings WHERE id=true'),
      query(user.role === 'buyer' ? 'SELECT project_id FROM wishlist_items WHERE buyer_id=$1' : 'SELECT project_id FROM wishlist_items WHERE false', user.role === 'buyer' ? [user.id] : []),
      query(user.role === 'buyer' ? 'SELECT project_id,qty FROM cart_items WHERE buyer_id=$1' : 'SELECT project_id,qty FROM cart_items WHERE false', user.role === 'buyer' ? [user.id] : []),
      query(isAdmin ? 'SELECT to_char(created_at,\'YYYY-MM-DD\') AS when,who,what FROM audit ORDER BY id DESC LIMIT 500' : 'SELECT 1 WHERE false'),
      query('SELECT message FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [user.id]),
      query(isAdmin ? `SELECT * FROM (
          SELECT t.id,u.name AS from,t.subject,t.status,t.created_at FROM support_tickets t JOIN users u ON u.id=t.user_id
          UNION ALL SELECT c.id,c.name AS from,'Website contact' AS subject,'open' AS status,c.created_at FROM contact_messages c
        ) messages ORDER BY created_at DESC` : 'SELECT id,subject,status FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC',isAdmin?[]:[user.id]),
      query('SELECT name AS category FROM categories ORDER BY name')
    ]);
    const settingsRow = settings.rows[0] || { commission_rate: 0.15, processing_rate: 0.015, upload_fee: 10000 };
    const sellerData = sellers.rows.map(s => ({ id: s.id, slug: s.slug || s.id, name: s.name, studio: s.studio || s.name, bio: s.bio || '', location: s.location || '', email: s.email, verified: !!s.studio_verified }));
    res.json({
      projects: projects.rows.map(projectOut), sellers: sellerData,
      buyers: buyers.rows.map(b => ({ id: b.id, name: b.name, email: b.email, joined: b.joined })),
      orders: orders.rows.map(orderOut),
      payouts: payouts.rows.map(p => ({ id: p.id, sellerId: p.seller_id, amount: Number(p.amount), date: p.created_at?.toISOString?.().slice(0,10), status: p.status })),
      wishlist: wishlist.rows.map(x => x.project_id), cart: cart.rows.map(x => ({ id: x.project_id, qty: x.qty })),
      session: user.role, currentUser:safeUser(user), settings: { commissionRate: Number(settingsRow.commission_rate), processingRate: Number(settingsRow.processing_rate), uploadFee: Number(settingsRow.upload_fee) },
      audit: audit.rows, categories: categories.rows.map(x => x.category),
      support: support.rows, notifications: notifications.rows.map(x => x.message)
    });
  }));

  app.get('/api/public/state', wrap(async (_req,res) => {
    const [projects,sellers,categories] = await Promise.all([
      query("SELECT * FROM projects WHERE status='published' ORDER BY featured DESC,created_at DESC LIMIT 200"),
      query(`SELECT u.id,u.name,sp.slug,sp.studio,sp.bio,sp.location,sp.verified
        FROM users u JOIN seller_profiles sp ON sp.user_id=u.id WHERE u.role='seller' ORDER BY u.created_at DESC`),
      query('SELECT name AS category FROM categories ORDER BY name')
    ]);
    res.json({
      projects:projects.rows.map(projectOut),
      sellers:sellers.rows.map(s=>({id:s.id,slug:s.slug,name:s.name,studio:s.studio,bio:s.bio,location:s.location,verified:s.verified,email:''})),
      buyers:[],orders:[],payouts:[],wishlist:[],cart:[],session:null,
      settings:{commissionRate:0.15,processingRate:0.015,uploadFee:0},audit:[],
      categories:categories.rows.map(c=>c.category),support:[],notifications:[]
    });
  }));
}
