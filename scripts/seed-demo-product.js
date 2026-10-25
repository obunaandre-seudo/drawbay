import crypto from 'node:crypto';
import { migrate, pool, transaction } from '../server/src/db.js';
import { hash } from '../server/src/lib.js';

const email = 'database-test@drawbay.invalid';
const demoPassword = crypto.randomBytes(32).toString('hex');

try {
  await migrate();
  await transaction(async client => {
    await client.query('SELECT 1');
    const { rows } = await client.query(
      `INSERT INTO users (role,name,email,pass,verified)
       VALUES ('seller','Guaranteed Impressions Database Test Studio',$1,$2,true)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [email, hash(demoPassword)]
    );
    const sellerId = rows[0].id;
    await client.query(
      `INSERT INTO seller_profiles (user_id,slug,studio,bio,location)
       VALUES ($1,'drawbay-database-test-studio','Guaranteed Impressions Database Test Studio',
         'Automated test listing used to verify the Guaranteed Impressions database connection. This is a demonstration record, not a construction-ready plan.',
         'Online')
       ON CONFLICT (user_id) DO UPDATE SET studio=EXCLUDED.studio,bio=EXCLUDED.bio`,
      [sellerId]
    );
    await client.query(
      `INSERT INTO projects (slug,title,description,category,style,price,bedrooms,bathrooms,floors,seller_id,img,status,featured,files)
       VALUES ('drawbay-database-connection-test','TEST LISTING - Guaranteed Impressions database connection check',
         'This clearly labeled demonstration listing verifies that Guaranteed Impressions can write and read marketplace products from the configured PostgreSQL database. It is not a construction document or a real architectural plan.',
         'Residential houses','Database test',1000,1,1,1,$1,
         'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=75',
         'published',false,'[]'::jsonb)
       ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,
         seller_id=EXCLUDED.seller_id,status='published',featured=false
       RETURNING id,slug,title,status`,
      [sellerId]
    );
    const project = (await client.query(
      `SELECT p.id,p.slug,p.title,p.status,u.email AS seller_email
       FROM projects p JOIN users u ON u.id=p.seller_id
       WHERE p.slug='drawbay-database-connection-test'`
    )).rows[0];
    console.log('Database write/read check passed:', JSON.stringify(project));
  });
} finally {
  await pool.end();
}
