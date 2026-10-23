import { app } from '../server/src/app.js';
import { migrate } from '../server/src/db.js';
import { seedAdmin } from '../server/src/bootstrap.js';
import { getExpressApiUrl } from './routing.js';

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

  const apiUrl = getExpressApiUrl(req.query);
  if (!apiUrl) {
    return res.status(404).json({ error: 'API route not found' });
  }

  req.url = apiUrl;
  return app(req, res);
}
