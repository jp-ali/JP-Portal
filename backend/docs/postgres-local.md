# Local PostgreSQL portal

The portal uses PostgreSQL at `127.0.0.1:5433` on this Windows computer. The database URL and login secrets are stored only in ignored `backend/.env`; the browser receives no database credentials. This local database starts empty. Existing test records from the earlier service are not imported.

## Run locally

From `backend/`:

1. `npm run db:start-local`
2. `npm run db:migrate`
3. `npm run db:smoke-postgres`
4. `npm run dev`

From the project root, run `npm run dev` for the Vite frontend. Login, data access, cards, visits, attendance, reports and news use the same local API. The API issues expiring JWTs in HttpOnly cookies and checks their session IDs in PostgreSQL.

## Database structure and backups

- `src/config/postgres.js` creates a server-only connection pool from `DATABASE_URL`.
- `src/db/migrations/` contains numbered SQL migrations with checksums.
- Migration `002_pakistan_area_catalog.sql` adds city area choices without replacing areas already saved by an admin. It was generated from the [Pakistan location dataset](https://github.com/salmannaeem112215/pakistan-location-info-system). Re-running migrations does not duplicate the catalog.
- `src/db/postgresDocumentStore.js` stores portal records in `portal_documents` with their collection path, original record ID and JSONB payload.
- `portal_sessions` tracks JWT expiry and revocation.
- `npm run db:backup` creates a custom-format dump under ignored `backend/backups/`.
- `npm run db:restore -- <dump path>` restores only into an empty database.

Copy backup dumps to another secure disk. Moving the portal and its database to Ubuntu5Server is a separate step; until then, this Windows computer must be running for phones to reach its API.
