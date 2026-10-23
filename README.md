# DrawBay

DrawBay is a full-stack marketplace for architectural plans and digital project files. The web client uses a PostgreSQL-backed Express API. Accounts, listings, reviews, carts, payments, orders, downloads, support requests and payout records are stored server-side.

## Start locally

1. Install Node.js 22+, Docker Desktop, and copy `.env.example` to `.env`.
2. Set unique local values for `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. Start the app and PostgreSQL with `docker compose up --build`.
4. Open `http://localhost:4000`. The first start applies the database schema and creates the administrator account.

For Vite hot reload, start PostgreSQL with Docker Compose and run `npm install` followed by `npm run dev`. The Vite server proxies `/api` to port 4000. Use Node 22 so the `--env-file-if-exists` script option is available.

## Production deployment

Build and run the included Docker image behind a TLS reverse proxy. Keep PostgreSQL, S3, Paystack, and Resend credentials in the hosting provider’s secret manager. Do not commit `.env` or use test credentials in production.

### Deploy on Vercel

Import the repository with the project root as the **Root Directory** and **Vite** as the framework preset. The included `vercel.json` sends frontend routes to the Vite-built SPA and `/api/*` requests to the Express serverless function. Vercel uses `npm run build` and `dist` for the frontend.

Add the production environment variables below in Vercel Project Settings before using the API. At minimum, set `DATABASE_URL`, `JWT_SECRET` (32+ random characters), `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (16+ characters). Configure the remaining email, payment, and object-storage variables before enabling those features. Set `APP_URL` to the deployed HTTPS URL and `PAYSTACK_SECRET_KEY` to a live key for production commerce. Use a managed PostgreSQL database and set `DATABASE_SSL=true` when its provider requires TLS. The function applies the SQL schema and seeds the initial admin account on its first request after a cold start.

Vercel project settings:

- Root Directory: `./`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Required production environment:

- `DATABASE_URL` for managed PostgreSQL. Set `DATABASE_SSL=true` when the database provider requires TLS.
- `JWT_SECRET`, a unique random value with at least 32 characters.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the initial admin password must be at least 16 characters.
- `APP_URL`, the public HTTPS origin.
- `PAYSTACK_SECRET_KEY`, a live secret key. Configure Paystack webhook URL as `https://your-domain/api/payments/paystack/webhook` and enable `charge.success`, `transfer.success`, `transfer.failed`, and `transfer.reversed` events.
- `RESEND_API_KEY` and `EMAIL_FROM` for verification and password recovery messages.
- `S3_BUCKET` and `S3_REGION`, plus workload identity or `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. Keep the bucket private. If using R2 or another S3 compatible provider, set `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE` as required.
- `CORS_ORIGIN` as a comma-separated list of trusted origins if the browser and API are hosted separately. The `APP_URL` origin is always allowed.

Configure bucket CORS to allow the application origin to `PUT` files with the signed `Content-Type` header. Configure database backups, object versioning/lifecycle, log retention, health monitoring, and TLS at the hosting layer. Set `TRUST_PROXY=true` only when the app is behind a trusted reverse proxy.

## Payments and file delivery

The server computes checkout amounts from published listings and initializes Paystack transactions. A buyer order is created only after the server verifies the transaction reference, NGN currency, exact amount, and successful status. Signed Paystack webhooks are verified with HMAC before payment or transfer records are updated. Listing fees use the same verification path.

Seller files upload directly to private S3-compatible storage using short-lived signed URLs. Only paid buyers can request five-minute download links. Listing previews are served through a public, read-only preview endpoint after publication. Configure malware scanning and moderation for user-uploaded files before opening uploads to the public.

Paystack transfers require a funded platform balance and transfer approval settings on the Paystack account. Seller payout destinations are registered with Paystack; DrawBay stores only the recipient reference and masked account details. Payout status changes to completed or failed only after signed Paystack transfer webhooks.

## Project structure

- `src/`: React storefront and account dashboards.
- `src/services/api.ts`: same-origin API client and in-memory UI state cache; no seeded marketplace records.
- `server/src/routes/`: authentication, catalogue, seller, buyer, admin, payment, storage, and application-state endpoints.
- `server/src/schema.sql`: PostgreSQL schema, applied on server startup.
- `Dockerfile`, `docker-compose.yml`: production image and local PostgreSQL deployment.

The API exposes `GET /api/health` for deployment health checks. It returns HTTP 200 when PostgreSQL is reachable and HTTP 503 otherwise. The Docker image includes a health check for this endpoint.

## Launch requirements

This repository contains the production-oriented application code and deployment scaffold. It cannot be made publicly live from the local workspace alone: deployment still needs the business’s domain/hosting account, production PostgreSQL, Paystack live account and webhook, email sender verification, private object-storage bucket, and production secrets. Before accepting customers, publish counsel-reviewed terms, privacy/refund policies, and complete the applicable business, tax, consumer-protection, and data-protection reviews for the markets where DrawBay will operate.

The current environment could not download npm dependencies, so the frontend build and live browser preview have not yet been verified here.
