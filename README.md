# School Visits Portal

React/Vite frontend and Express API. Portal records, photos and PDF chunks are stored in local PostgreSQL. Authentication uses bcrypt password hashes and expiring JWTs in HttpOnly cookies. The old test database is intentionally not imported.

## Local setup

Install Node.js 20+, npm and PostgreSQL. Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD_HASH`. Keep the `.env` file private. The PostgreSQL URL is read only by the API, never by the browser.

From the project root, run `npm ci`. In `backend/`, run `npm ci`, then:

```sh
npm run db:start-local
npm run db:migrate
npm run db:smoke-postgres
npm run dev
```

In a separate terminal at the project root, run `npm run dev` and open `http://localhost:5173`. On this computer, `start-local.cmd` starts the local preview and API. See [local PostgreSQL guide](backend/docs/postgres-local.md) for backup and restore commands.

The frontend proxies `/api` to the backend on port 3001. For phone testing on the same Wi-Fi, open `http://<computer-Wi-Fi-IP>:5173`. Keep this computer and PostgreSQL running while phones use the portal. The later move to Ubuntu5Server is a separate deployment step.

## Project structure

- `src/`: portal screens, feature controllers, exports, offline drafts and the API data adapter.
- `backend/src/routes/`: authenticated HTTP endpoints.
- `backend/src/services/`: login, marketer, visit, news, card and report logic.
- `backend/src/db/`: PostgreSQL document adapter, SQL migrations and backup tools.
- `backend/tests/`: API and service tests.

The API stores portal documents in JSONB and keeps their collection path and original ID. `portal_sessions` tracks JWT expiry and revocation. New marketer passwords are hashed before storage. Local offline visit drafts stay in the browser's IndexedDB until sync succeeds.

## Checks

Run `npm run build` from the root, `npm test` and `npm run db:smoke-postgres` from `backend/`. The smoke script creates temporary accounts and visits, tests login and access controls, then deletes its records.

## Deployment

The production path is GitHub Actions → GHCR → Ubuntu VM with Docker Compose, PostgreSQL and Caddy. See [production deployment guide](deploy/README.md) for VM setup, GitHub secrets, release flow, backups and rollback. The local `127.0.0.1` database URL cannot be used on the VM. Scheduled News requires the API container to remain online at delivery time.
