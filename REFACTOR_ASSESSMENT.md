# Refactor assessment

The original entry point was `src/main.jsx`, rendering a nearly 9,000-line `src/App.jsx` component. Vite still builds the React app. `App.jsx` now contains only login and session restoration. It loads `PortalApp.jsx` after authentication; that file connects feature controllers to separate admin and marketer portals. Location, attendance, visits, action plans, verification, media, account management, catalogues, and expenses have feature modules under `src/features/`. Shared report tables and presentation elements live in `src/ui/`. The authenticated composition root remains about 780 lines, mostly because it passes a broad context into the existing role panels and owns shared report controls.

## Existing data and integrations

- Firestore project: `school-visits-portal-654e0`. Collections used: `cities`, `areas`, `schools`, `marketers`, `deleted_marketers`, `visits`, `samples`, `attendance`, `action_plans`, `petrol_rates`, `catalogues` (with `chunks` subcollection), `deleted_media`, and `system_meta`.
- Some location lists are cached in browser local storage. No Firebase Storage calls are present in the active app. Photos are stored in Firestore records; PDF catalogues are split into Firestore chunk documents.
- OpenStreetMap Overpass and Nominatim, a GitHub city list, WhatsApp links, and CDN-loaded PDF/Excel libraries are used. The unused WhatsApp bot prototype has been moved to `legacy/whatsapp-bot.cjs`.
- Authentication uses Express sessions and server-side password verification. Marketer records with legacy plain-text passwords are migrated on successful login only when `ENABLE_LEGACY_PASSWORD_MIGRATION=true`; the default is `false` pending backup. Other feature data still uses browser Firestore calls, so Firestore rules remain critical to authorization.

## Feature inventory

- Admin: dashboard; marketer create/edit, assignments, removal/restoration; city/area/school management and OpenStreetMap sync; attendance and petrol rates; action plans; visits; samples; verification calls; expense reports; catalogue uploads/downloads; active/deleted media and restoration; PDF/Excel exports.
- Marketer: attendance with camera proof; action plans; assigned school visits; sample entry/history; visit history; expenses; catalogue downloads; support and WhatsApp sharing.

## Proposed incremental architecture

Keep React/Vite and the existing Firestore project and document IDs. Extract constants, formatting/export helpers, and view components from `App.jsx` first. Add a separate Express API using Firebase Admin SDK with route/controller/service modules by domain. Introduce authenticated sessions and per-record authorization before routing any private data through Express. Move one feature at a time, with contract tests against Firestore emulator fixtures and UI checks after each feature. Do not run automatic database seeding or migrations during server startup.

The user approved authentication migration. Express now verifies admin and marketer logins, issues signed HTTP-only sessions, and manages marketer accounts through admin-only endpoints. Password display/export has been removed from marketer reports. Legacy marketer password hashing is implemented but disabled in `backend/.env` until a verified Firestore backup and coordinated deployment. Server access to live Firestore still needs a service-account credential. Do not deploy the remaining browser Firestore features without reviewing the project's Firestore rules.

## Current deployment and verification gaps

The separate root `firebase.js`, root-only package files, destructive `remove_*.js` scripts, and empty nested `src/src/App.jsx` were unused and removed. Firebase web configuration now comes from the frontend `.env`; the backend's `config/firebase.js` uses Application Default Credentials and contains no key. Firestore rules and production environment are not present, so effective data permissions and live record access cannot be verified from this checkout.
