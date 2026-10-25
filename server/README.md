# Guaranteed Impressions server

`index.js` starts the Express API, applies `src/schema.sql` to PostgreSQL, seeds the configured administrator, and serves the built frontend from `dist/`.

## Main files

- `src/app.js`: security headers, CORS, rate limits, health endpoint, API routes, and static frontend hosting.
- `src/db.js`: PostgreSQL connection pool and schema migration runner.
- `src/schema.sql`: PostgreSQL schema. Startup applies it with `CREATE TABLE IF NOT EXISTS` and additive column migrations.
- `src/bootstrap.js`: creates the first administrator when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured.
- `src/routes/`: auth, catalogue, seller, buyer, admin, payments, file storage, state, and contact endpoints.

Use the root `.env.example` as a template. Never commit `.env` or production credentials. The `/api/health` endpoint checks database connectivity and returns HTTP 503 if PostgreSQL is unavailable.
