# Current architecture assessment

The portal uses a React/Vite frontend and Express API. The browser reads and writes through the authenticated `/api` endpoints. The API stores records in PostgreSQL `portal_documents` and sessions in `portal_sessions`. Numbered SQL migrations live in `backend/src/db/migrations`.

The local database starts empty because the prior records were test data. Photos and catalogue PDF chunks are stored in PostgreSQL record payloads; this should be reviewed before large production volumes. Authentication uses bcrypt password hashes and JWT cookies with session revocation.

Local smoke tests cover admin and marketer login, marketer creation, card creation, profile photo storage, visits import, record scope and logout. Production deployment, storage capacity and backup restore on Ubuntu5Server still need separate validation.
