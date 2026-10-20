# School Visits Portal

This repository is in an incremental React + Express refactor. The Vite frontend now uses Express for login, sessions, and admin marketer account management. Other features still use direct browser Firestore calls. See [REFACTOR_ASSESSMENT.md](./REFACTOR_ASSESSMENT.md) before moving another feature.

## Frontend structure

- `src/App.jsx`: small login and session shell. It loads the authenticated application only after a session is available.
- `src/PortalApp.jsx`: authenticated composition root. It connects feature controllers to the role portals and owns the remaining shared report controls.
- `src/features/`: separate controllers for locations and assignments, marketers, visits, attendance, action plans, verification calls, media, catalogues, and expenses.
- `src/pages/LoginPage.jsx`, `AdminPortal.jsx`, and `MarketerPortal.jsx`: role-level views. The authenticated application and both role portals load on demand.
- `src/pages/admin/` and `src/pages/marketer/`: feature panels for dashboard, attendance, visits, samples, catalogues, reports, and account management. Panels read portal state through `src/context/PortalContext.jsx` rather than a separate prop object built by each portal.
- `src/styles/`: existing CSS extracted without changing its mounting behavior.
- `src/domain/catalog.js`: city catalog, action-plan purposes, and location ID helpers.
- `src/services/`: frontend auth, marketer, and Firebase adapters, report export functions, OpenStreetMap requests/parsers, and image helpers.
- `src/ui/`: shared presentation styles, decoration, and report tables.
- `legacy/`: unused WhatsApp bot prototype retained for reference. The root duplicate Firebase file and old catalogue-removal scripts were removed because they were not imported or run by either application.

## Development

On Windows, double-click `start-local.cmd` to start both the frontend and API in the background, then open `http://localhost:5173/`. Run it again after restarting the laptop. It leaves already-running servers alone and writes startup logs under `%TEMP%\jp-portal-local`.

Requirements: Node.js 20 or later and npm.

Frontend, from this directory:

```sh
npm ci
npm run dev
```

API, in a second terminal:

```sh
cd backend
npm ci
npm run dev
```

The frontend uses `http://localhost:5173` and proxies `/api` to port `3001`. Vite keeps port `5173` fixed so the API can check the configured development origin. The API defaults to port `3001`; set `PORT` in `backend/.env` to choose another port. `GET /api/health` returns `{ "status": "ok" }`.

For phone testing, connect the phone and computer to the same Wi-Fi and open `http://<computer-Wi-Fi-IP>:5173` on the phone. The Vite server listens on the local network, and its `/api` proxy passes same-origin mobile login requests to the local API. Keep both frontend and API running on the computer. The phone's own `localhost` points to the phone, so use the computer's Wi-Fi IP.

## Environment variables

The frontend `.env` contains `VITE_API_BASE_URL` and the active Firebase web configuration; `.env.example` is its template. These `VITE_` values are included in the browser build and are not private credentials. `backend/.env` has been created locally and is ignored by Git. It contains the existing admin account's bcrypt hash, a generated session secret, and the existing Firebase project ID. **Set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of a service-account JSON file for this Firebase project before marketer login or account management can use Firestore.** Keep that JSON file outside the repository. `backend/.env.example` lists all server keys. Use a different `SESSION_SECRET` and admin password hash in each deployed environment. `NODE_ENV=production` marks session cookies `Secure`.

`ENABLE_LEGACY_PASSWORD_MIGRATION=false` is the default. After a verified Firestore backup and coordinated frontend/backend deployment, set it to `true` to replace each marketer's plain-text password with a hash on their next successful login. Login works while it is `false`, but the legacy password remains in Firestore until migration is enabled.

The frontend defaults to the same-origin `/api` path. `VITE_API_BASE_URL` is optional if the deployment uses a different API path. In development, `DEV_FRONTEND_ORIGIN` in `backend/.env` allows the Vite proxy's browser origin for login and logout; set it to the exact URL used in the browser if that URL changes. This exception is disabled when `NODE_ENV=production`. Deploy the frontend and API behind the same origin because the session cookie is scoped to `/api` and other cross-origin requests are rejected.

## Current API

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API health |
| POST | `/api/auth/login` | Public, rate limited | Admin or marketer login; legacy password migration depends on the environment switch |
| GET | `/api/auth/me` | Signed session | Restore current profile |
| POST | `/api/auth/logout` | Public | Clear session cookie |
| PATCH | `/api/visits/:id` | Admin or visit owner on visit date | Edit visit details; marketer date uses Asia/Karachi calendar |
| GET | `/api/marketers` | Admin | List active marketers without passwords or hashes |
| GET | `/api/marketers/accessible` | Marketer | List own and subordinate profiles without passwords or hashes |
| GET | `/api/marketers/deleted` | Admin | List archived marketers without passwords or hashes |
| POST | `/api/marketers` | Admin | Create marketer with hashed password |
| PATCH | `/api/marketers/:id` | Admin | Update marketer; optional password reset |
| DELETE | `/api/marketers/:id` | Admin | Archive marketer |
| POST | `/api/marketers/deleted/:id/restore` | Admin | Restore archived marketer |
| DELETE | `/api/marketers/deleted/:id` | Admin | Permanently remove archived marketer |

Password fields are no longer shown or exported in marketer reports. Existing marketer accounts retain their IDs; archived accounts now store `originalMarketerId` so restoration preserves the active ID when possible.

## Verification

```sh
npm run build
cd backend
npm test
```

## Production plan

Build the frontend with `npm run build` and serve `dist/` as static files. Run the API with `npm start` behind HTTPS and a reverse proxy. Keep Firebase Admin credentials in the API process environment, outside the repository. Point the frontend's future `/api` requests to the same origin through the reverse proxy. The current frontend still connects directly to Firestore and relies on the existing Firestore rules, which are not included here.

Before deploying this version, export a Firestore backup, verify restoration in a separate project, and retain the previous frontend build for rollback. Once `ENABLE_LEGACY_PASSWORD_MIGRATION=true`, the first successful login for each legacy marketer removes its plaintext `password` field and writes `passwordHash`; rolling back the frontend alone would then prevent that marketer from logging in. Roll back frontend and backend together, or provide a separate account recovery process. Do not reset or reseed live collections. Existing Firestore rules are not in this checkout; they must be reviewed before production because most features still use browser Firestore access.
