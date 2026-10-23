import { app } from './src/app.js';
import { migrate, pool } from './src/db.js';
import { seedAdmin } from './src/bootstrap.js';
import { PORT } from './src/lib.js';
import { getDatabaseUrl } from '../api/production-config.js';

try {
  if(process.env.NODE_ENV==='production'){
    const required=['JWT_SECRET','ADMIN_EMAIL','ADMIN_PASSWORD','APP_URL','PAYSTACK_SECRET_KEY','RESEND_API_KEY','EMAIL_FROM','S3_BUCKET','S3_REGION'];
    const missing=required.filter(key=>!process.env[key]);
    if(!getDatabaseUrl(process.env))missing.unshift('DATABASE_URL (or POSTGRES_URL)');
    if(missing.length)throw new Error(`Missing production configuration: ${missing.join(', ')}`);
    if(!process.env.APP_URL.startsWith('https://'))throw new Error('APP_URL must use HTTPS in production');
    if(!process.env.PAYSTACK_SECRET_KEY.startsWith('sk_live_'))throw new Error('Production requires a live Paystack secret key');
    if(process.env.ADMIN_PASSWORD.length<16)throw new Error('ADMIN_PASSWORD must contain at least 16 characters');
  }
  await migrate();
  await seedAdmin();
  const server = app.listen(PORT, () => console.info(`DrawBay listening on port ${PORT}`));
  const shutdown = signal => server.close(async () => { await pool.end(); console.info(`Closed after ${signal}`); process.exit(0); });
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
} catch (error) {
  console.error('Startup failed:', error);
  await pool.end();
  process.exit(1);
}
