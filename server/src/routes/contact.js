import { query } from '../lib.js';
import { wrap, bad } from '../middleware.js';

export default function contactRoutes(app) {
  app.post('/api/contact', wrap(async (req,res) => {
    const name=String(req.body?.name||'').trim();
    const email=String(req.body?.email||'').trim().toLowerCase();
    const message=String(req.body?.message||'').trim();
    if(name.length<2||name.length>120)return bad(res,'Name must be 2 to 120 characters');
    if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return bad(res,'Enter a valid email address');
    if(message.length<10||message.length>5000)return bad(res,'Message must be 10 to 5000 characters');
    await query('INSERT INTO contact_messages (name,email,message) VALUES ($1,$2,$3)',[name,email,message]);
    res.status(201).json({message:'Your message has been sent to the DrawBay team.'});
  }));
}
