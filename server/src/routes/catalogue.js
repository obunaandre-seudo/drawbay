import { query, projectOut } from '../lib.js';
import { wrap } from '../middleware.js';

export default function catalogueRoutes(app) {
  app.get('/api/projects', wrap(async (req,res) => {
    const q = String(req.query.q || '').trim().slice(0,120);
    const category = String(req.query.category || '').trim().slice(0,100);
    const maxPrice = Number(req.query.maxPrice || 0);
    const { rows } = await query(`SELECT * FROM projects WHERE status='published'
      AND ($1='' OR title ILIKE $2 OR description ILIKE $2 OR category ILIKE $2 OR style ILIKE $2)
      AND ($3='' OR category=$3) AND ($4<=0 OR price<=$4)
      ORDER BY featured DESC,created_at DESC LIMIT 200`, [q,`%${q}%`,category,Number.isFinite(maxPrice)?maxPrice:0]);
    res.json(rows.map(projectOut));
  }));

  app.get('/api/projects/:slug', wrap(async (req,res) => {
    const { rows } = await query("SELECT * FROM projects WHERE slug=$1 AND status='published'", [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: 'Project not found' });
    await query('UPDATE projects SET popularity=popularity+1 WHERE id=$1', [rows[0].id]);
    res.json(projectOut(rows[0]));
  }));

  app.get('/api/sellers/:slug', wrap(async (req,res) => {
    const { rows } = await query(`SELECT u.id,u.name,u.email,sp.slug,sp.studio,sp.bio,sp.location,sp.verified
      FROM seller_profiles sp JOIN users u ON u.id=sp.user_id WHERE sp.slug=$1`, [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ error: 'Seller not found' });
    const { rows: projects } = await query("SELECT * FROM projects WHERE seller_id=$1 AND status='published' ORDER BY created_at DESC", [rows[0].id]);
    res.json({ seller:{id:rows[0].id,slug:rows[0].slug,name:rows[0].name,studio:rows[0].studio,bio:rows[0].bio,location:rows[0].location,email:rows[0].email,verified:rows[0].verified},projects:projects.map(projectOut) });
  }));
}
