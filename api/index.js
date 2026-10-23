import { getExpressApiUrl } from './routing.js';
import { getProductionConfigProblems } from './production-config.js';

let startup;

async function initialize() {
  let startupStage = 'configuration';
  try {
    const problems = getProductionConfigProblems(process.env);
    if (problems.length) {
      throw new Error(`Missing or invalid production configuration: ${problems.join(', ')}`);
    }

    startupStage = 'module_load';
    const [{ app }, { migrate }, { seedAdmin }] = await Promise.all([
      import('../server/src/app.js'),
      import('../server/src/db.js'),
      import('../server/src/bootstrap.js')
    ]);

    startupStage = 'database_migration';
    await migrate();
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      startupStage = 'admin_seed';
      await seedAdmin();
    }
    return app;
  } catch (error) {
    error.startupStage ??= startupStage;
    throw error;
  }
}

export default async function handler(req, res) {
  let app;
  try {
    startup ??= initialize();
    app = await startup;
  } catch (error) {
    startup = undefined;
    console.error('API startup failed:', error);
    const message = error.message.startsWith('Missing or invalid production configuration:')
      ? error.message
      : 'API is temporarily unavailable. Check the database connection and Vercel function logs.';
    const diagnosticCode = typeof error?.code === 'string' ? error.code : error?.name;
    return res.status(503).json({
      error: message,
      ...(diagnosticCode ? { diagnosticCode } : {}),
      ...(error.startupStage ? { diagnosticStage: error.startupStage } : {})
    });
  }

  const apiUrl = getExpressApiUrl(req.query, req.url);
  if (!apiUrl) {
    return res.status(404).json({ error: 'API route not found' });
  }

  req.url = apiUrl;
  return app(req, res);
}
