# Company portals and owner management

## Addresses

- Existing Javed portal: `/` on `visit.javedpublishers.com` (unchanged).
- Platform owner: `/owner` with its separate owner account and cookie.
- Company portal: `/company/<slug>/` on the current host; no new DNS needed.
- Future shared subdomains: set `COMPANY_BASE_DOMAIN` in `portal.env`, configure wildcard DNS and HTTPS on the public reverse proxy, and recreate the app. Then `<slug>.<base-domain>` resolves the company.
- Custom hostnames: register under the company **Admin & address** tab and configure DNS and Caddy HTTPS before sharing. The owner screen does not purchase domains or modify DNS automatically.

## Owner workflow

Open `/owner` → sign in → **Companies** → **Add company**.
Fill in identity, admin name/email/password and a permanent slug. All new company records start empty.
Manage logo, banner, color and support contact in **Identity**, company access in **Features**, and company-specific imprints in **Books & series**. Existing report records are not removed when book names change.

**Open portal** opens that company's login; it does not impersonate its admin. Company admins can manage their own branding and books in **Company Settings**. They cannot grant features, activate portals, change domains or enter the owner workspace. Owner account settings support a password change; changing it revokes existing owner sessions.

## Owner bootstrap (server console only)

Use `backend/scripts/createOwner.js` with `OWNER_EMAIL`, `OWNER_PASSWORD` (12–128 characters) and optional `OWNER_NAME`. Passwords are bcrypt-hashed. There is no public bootstrap endpoint or default owner password. This command refuses duplicate emails instead of resetting an existing owner.

Run it in the app container or a one-off Compose app service with the production database environment. Supply secrets through a protected environment file or interactive environment; never commit them.

## Isolation and access

- Every document read, count, query, batch and transaction filters the PostgreSQL `company_id` column. The composite key is `(company_id, path)`.
- Request-local `AsyncLocalStorage` selects a company; account claims and persisted sessions bind to that company. Switching a slug does not transfer the session.
- Company deactivation and company admin credential changes invalidate company sessions. Feature changes apply on the next API request; refresh the UI to update menus.
- Generic data APIs and direct service routes enforce data feature restrictions. Download controls are hidden and export functions are gated; server download endpoints are gated too. A client that already has authorized data can independently reformat it, and downloaded files cannot be recalled.
- Company profile/catalog caches and IndexedDB draft stores are namespaced. Javed keeps legacy keys and pending drafts. Separate hostnames also provide browser-origin isolation. On same-host `/company/` links, one company login replaces the company's session cookie; another company's tab must sign in again.
- Offline access reflects the last online permissions; offline devices cannot receive permission revocation until they reconnect. The server rechecks access before syncing drafts.
- Scheduled news is processed separately for each active company; notifications carry the correct company link.

## First deployment and rollback

1. Take a PostgreSQL custom-format dump and record document counts / a payload checksum.
2. Stop the old app for the schema transition, leaving PostgreSQL and Caddy running.
3. Run the new image's `backend/src/db/migrate.js` in a one-off app container.
4. Verify all existing records are in `company_id='javed'`, with unchanged payloads. Start the new app and verify health, company branding, owner login and existing account sessions.
5. Bootstrap only the owner; do not create demonstration companies on production.

Migration `004_white_label.sql` is transactional. It tags existing rows as Javed without changing their payloads. It changes the primary key, so a pre-white-label app must not be run against the new schema while other companies exist. For a first-release emergency rollback with **only Javed present**, `backend/scripts/whiteLabelCompatibility.js enable` creates a legacy `path` uniqueness index; then restore the prior app image. Before returning to the white-label app, run `... disable` to remove that compatibility index. The helper refuses enable if another company exists. A full backup restore must use a new empty database, not overwrite a live database.

## Verification

Backend tests include identical IDs across companies, concurrent reads/writes, session mismatch, direct API and generic batch feature denial, owner isolation, credential revocation and preservation of a Javed fixture. Browser verification covers owner login, company creation/editing, branding, feature switches, company login and desktop/mobile widths. No actual iPhone/Android hardware capture claim is made by these browser tests.
