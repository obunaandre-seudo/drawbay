import { app } from '../server/src/app.js';
import { migrate } from '../server/src/db.js';
import { seedAdmin } from '../server/src/bootstrap.js';

let startup;

export default async function handler(req, res) {
  startup ??= migrate().then(seedAdmin);
  try {
    await startup;
  } catch (error) {
    startup = undefined;
    console.error('API startup failed:', error);
    return res.status(503).json({ error: 'API startup failed' });
  }
  return app(req, res);
}
