# Production deployment

The `main` branch is the release source. Every pull request and push to `main` runs frontend tests, a production frontend build, and API tests. A successful `main` run builds the frontend and API into one Docker image and publishes it to GHCR under the commit SHA. Once `DEPLOY_ENABLED=true`, the same run deploys that immutable image over SSH. GitHub Pages is no longer used because it cannot host the API.

The repository still contains `render.yaml` from the earlier hosting plan. If a Render service is connected to this repository, disable its automatic deploy before enabling the VM pipeline so a push does not release to both hosts.

## VM preparation (Ubuntu)

1. Install Docker Engine with the Compose plugin (version 2.30 or newer) from Docker's Ubuntu instructions. Use a dedicated non-root deploy user with permission to run Docker. Docker group membership grants root-equivalent access, so restrict that account and its SSH key.
2. Create `/opt/jp-portal`, owned by the deploy user. Copy `env.example` to `/opt/jp-portal/.env` and `portal.env.example` to `/opt/jp-portal/portal.env`; set both modes to `600`. Use a long random password containing URL-safe characters for `POSTGRES_PASSWORD` and the same value in `DATABASE_URL`. Set a unique 32+ character `SESSION_SECRET` and a bcrypt `ADMIN_PASSWORD_HASH`. Preserve these values across deploys. `APP_DOMAIN` must be a DNS name pointed at this VM. The app environment file is read in Compose's raw mode so `$` characters in the bcrypt hash remain intact.
3. Open inbound TCP 80 and 443, UDP 443 (optional HTTP/3), and SSH from trusted sources. Do not expose PostgreSQL port 5432 or app port 3001. Caddy obtains and renews the TLS certificate automatically when DNS and ports are ready.
4. Set repository variable `DEPLOY_ENABLED` to `true` only after the VM is prepared. Add a GitHub `production` environment and configure its protection rules and authorized reviewers as appropriate. Add these environment secrets:
   - `DEPLOY_HOST`: VM DNS name or IP for SSH.
   - `DEPLOY_USER`: dedicated deploy user.
   - `DEPLOY_SSH_KEY`: private key for that user, with no passphrase for Actions.
   - `DEPLOY_KNOWN_HOSTS`: verified SSH host-key line for the VM. Obtain its fingerprint through an independent trusted channel before saving it; do not blindly trust an `ssh-keyscan` result.
5. Push to `main` or run the workflow manually. The workflow uses `GITHUB_TOKEN` to authenticate to GHCR on each deploy. For a private repository, ensure the package grants this repository Actions read access.

The deploy script pulls the exact commit image, starts PostgreSQL, saves a database dump, applies forward-only migrations, starts the new app, checks its container health, and starts or refreshes Caddy. If the app does not become healthy, it restores the prior app image. Database migrations are not automatically undone; write additive, backward-compatible migrations for releases that may need rollback.

## Operations

- Current image: `cat /opt/jp-portal/current-image`.
- Status: `cd /opt/jp-portal && APP_IMAGE=$(cat current-image) docker compose -f compose.yaml ps`.
- Logs: `cd /opt/jp-portal && APP_IMAGE=$(cat current-image) docker compose -f compose.yaml logs --tail=200 app`.
- Manual rollback: `cd /opt/jp-portal && bash deploy.sh ghcr.io/OWNER/REPO:PREVIOUS_COMMIT_SHA`. This runs migrations again, so use only a version compatible with the current schema.
- Pre-deploy dumps: `/opt/jp-portal/backups/`. Copy them to encrypted off-VM storage and arrange a scheduled backup job. Test restore into a separate database before relying on the backups. Keep sufficient disk space for the database, image layers, and dumps.
- Restore: stop the app; create a fresh PostgreSQL database; use `pg_restore` against a verified dump; then restart a compatible app image. Never restore over the active database without a recovery plan.

Production secrets remain in the VM `.env` and `portal.env`; Actions stores only SSH credentials. The Docker image contains no environment file. Browser requests and `/api` share one HTTPS origin, which is required by the session cookie and origin checks.

Native CorelDRAW `.cdr` conversion uses Windows COM and is unavailable on the Ubuntu container. The card SVG export remains available. If native CDR output is required in production, it needs a separate Windows conversion worker.
