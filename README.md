# LaunchPad – Multi-tenant SaaS Skeleton (Docker-first)

![ci](https://github.com/Araychaudhur/LaunchPad/actions/workflows/ci.yml/badge.svg?branch=main)

A bootable starter for a production-grade, multi-tenant SaaS: **Next.js (web)**, **NestJS (API)**, **Postgres**, **Redis**, **Nginx edge**, and **Observability** (OpenTelemetry → Collector, Prometheus, Grafana). Fully containerized for **Windows + VSCode** with **Docker only**.

---

## Run in 60 seconds (Windows PowerShell)
```powershell
Copy-Item .env.example .env
docker compose up --build -d
````
## LaunchPad — UI Update (Phase 1)

This update introduces a non-breaking **UI foundation** for the web app:

- **Tailwind CSS** + PostCSS added to `apps/web`
- New global stylesheet: `apps/web/src/app/globals.css`
- Minimal layout polish via `apps/web/src/app/layout.tsx` (keeps all logic and routes intact)
- Dockerfile updated to include Tailwind/PostCSS configs during `next build`

### Files changed/added
- `apps/web/package.json`
- `apps/web/postcss.config.js`
- `apps/web/tailwind.config.js`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/Dockerfile` (COPY line includes Tailwind/PostCSS configs)

---
## Blue/Green tip

If the browser shows an empty response, your shell may be overriding `.env`:

```powershell
$env:ACTIVE_COLOR = "blue"
docker compose up -d --force-recreate edge
```

## Stripe (test mode)

Set the following in `.env`:

```
APP_URL=http://localhost:8080
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...   # must be a recurring price
# Optional (for webhooks via Stripe CLI):
# STRIPE_WEBHOOK_SECRET=whsec_...
```

## Billing troubleshooting

* **500 on “Subscribe (test mode)” with a foreign-key error**
  Sign **out** and sign back **in** to refresh the JWT (tenant id may have changed).
* **Tables missing (older DB volume)**
  Re-apply `infra/postgres/init/004_billing.sql` (and `005_*.sql` if present) or recreate the DB volume.
* **Not redirected to Stripe**
  Ensure `STRIPE_PRICE_ID` is **recurring** and `APP_URL` is set; restart `api-*` to pick up env changes.

## Verification checklist

* `GET /health` → `200` (edge)
* `GET /api/health` → `{ status: "ok", service: "api" }`
* `/signin` works (default creds shown on the page)
* `/admin` lists orgs; `/admin/profile` shows your user JSON
* `/billing` loads status; **Subscribe** redirects to Stripe in test mode
* `/premium` is gated until subscription is active


### Open these in your browser

* App: [http://localhost:8080/](http://localhost:8080/)
* API health: [http://localhost:8080/api/health](http://localhost:8080/api/health)
* Prometheus: [http://localhost:9090/](http://localhost:9090/)
* Grafana: [http://localhost:3002/](http://localhost:3002/) (admin/admin)
* MailDev: [http://localhost:1080/](http://localhost:1080/)

---

## Blue/Green demo (local)

```powershell
# Start green alongside blue
docker compose --profile green up -d --build api-green web-green

# Switch traffic to green via edge
$env:ACTIVE_COLOR = "green"
docker compose up -d edge
```

Switch back by setting `ACTIVE_COLOR="blue"` and restarting `edge`.

---

## Milestones & Progress

### ✅ M0 — Bootable skeleton

* Next.js + NestJS behind Nginx edge (rate limiting + passive circuit breaker).
* Postgres, Redis, MailDev; OTEL → Collector; Prometheus + Grafana datasource.
* Docker-only dev (no Node on host). GitHub Actions CI health-checks via edge.
* **Outcome:** `docker compose up --build` brings up the stack; `/api/health` OK.

### ✅ M1a — Multitenancy + RLS + JWT + seed

* **Schema:** tenants, users, orgs, memberships.
* **RLS:** enforced via per-request GUCs (`app.tenant_id`, `app.user_id`).
* **Seed:** tenant `Acme`, org `Acme HQ`, admin user `admin@acme.test` / `admin123!`.
* **API:** `POST /api/auth/login` → `{ token }`, `GET /api/me`, `GET /api/orgs` (RLS).
* **Quick verify (PowerShell):**

  ```powershell
  $body = @{ email = "admin@acme.test"; password = "admin123!" } | ConvertTo-Json
  $login = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login -ContentType "application/json" -Body $body
  $token = $login.token
  Invoke-RestMethod -Uri http://localhost:8080/api/me   -Headers @{ Authorization = "Bearer $token" }
  Invoke-RestMethod -Uri http://localhost:8080/api/orgs -Headers @{ Authorization = "Bearer $token" }
  ```

  **Expected:** `/me` shows your ids; `/orgs` shows `[ { name: "Acme HQ" } ]`.

### ✅ M1b — Web login (NextAuth) + admin page

* **NextAuth (Credentials)** bridges to API `/auth/login`.
* API JWT stored in session; server components can call API with it.
* **Admin page:** `/admin` fetches `/api/orgs` server-side using your JWT.
* **Edge routing:** `/api/auth/*` → **web**; other `/api/*` → **API**.
* **Quick verify:**

  1. Open `http://localhost:8080/signin`
  2. Login with `admin@acme.test / admin123!`
  3. Visit `http://localhost:8080/admin` → see your orgs JSON.

### ✅ M1c — UI polish for Admin

* Server-side **redirect to /signin** when not authenticated.
* Reusable `apiFetch()` helper for server components (uses session JWT).
* New **/admin/profile** page (renders `/api/me` payload).
* Cleaner **/admin** layout with simple nav (Orgs / Profile / Home).

### ✅ M2 — RBAC + Audit Logs

- **RBAC guard**: `RequireTenantRole('ADMIN','OWNER')` checks tenant role via memberships.
- **Audit logs** table with RLS; helper writes `{ action, resource, resource_id, meta }`.
- **Endpoints**:
  - `POST /api/orgs` – create org (requires ADMIN/OWNER) and writes `org.create` audit.
  - `GET  /api/audit-logs` – list recent audit events (ADMIN/OWNER).
- **Seeded user**: `member@acme.test` / `member123!` (role: MEMBER) to validate deny paths.
- **Edge routing note**: exact match routes `/api/auth/login` → API; all other `/api/auth/*` → Web (NextAuth).
- **Quick verify (PowerShell)**:
  ```powershell
  # Admin can create org
  $admin = (Invoke-RestMethod -Method Post http://localhost:8080/api/auth/login `
    -ContentType application/json `
    -Body (@{ email="admin@acme.test"; password="admin123!" } | ConvertTo-Json)).token

  Invoke-RestMethod -Method Post http://localhost:8080/api/orgs `
    -Headers @{ Authorization = "Bearer $admin" } `
    -ContentType application/json -Body '{"name":"Acme Lab"}'

  Invoke-RestMethod http://localhost:8080/api/audit-logs -Headers @{ Authorization = "Bearer $admin" }

  # Member is denied (403)
  $member = (Invoke-RestMethod -Method Post http://localhost:8080/api/auth/login `
    -ContentType application/json `
    -Body (@{ email="member@acme.test"; password="member123!" } | ConvertTo-Json)).token

  try {
    Invoke-RestMethod -Method Post http://localhost:8080/api/orgs `
      -Headers @{ Authorization = "Bearer $member" } `
      -ContentType application/json -Body '{"name":"Should Fail"}'
  } catch { $_.Exception.Message } # expect 403

### ✅ M2b — SLOs (P95 latency & error rate)

- API exposes Prometheus metrics (`/metrics`) with histogram (`http_request_duration_seconds`) and counter (`http_requests_total`).
- Prometheus recording rules:
  - `slo:http_request_duration_seconds:p95:5m`
  - `sli:http_error_rate:ratio:5m`
- Grafana dashboard **“LaunchPad SLOs”** visualizes both over time.
- Quick verify:
  ```powershell
  1..50 | % { Invoke-RestMethod http://localhost:8080/api/health -ErrorAction SilentlyContinue | Out-Null; Start-Sleep -Milliseconds 200 }

### ✅ M3 — Billing (Stripe test mode) + Idempotent Webhooks + Feature Flags

* **DB** (keeps existing data):
  `billing_customers`, `subscriptions`, `processed_events` *(idempotency ledger)*, `feature_flags` (tenant-scoped).
  RLS on tenant tables; `processed_events` is global.
* **API**

  * `POST /api/billing/checkout` → creates Stripe **Checkout Session** (JWT required)
  * `GET  /api/billing/status` → returns `{ subscription, flags:{ premium } }` (JWT required)
  * `POST /api/webhooks/stripe` → handles events; **idempotent** via `processed_events`
* **Edge/Nginx**: special route `= /api/webhooks/stripe` (no rate-limit) to API.
* **Web**: `/billing` page (requires login). Shows Premium flag + subscription id and has **Subscribe (test mode)** button.

### ✅ M3b — Customer Portal + Cancellation messaging (polish)

**What changed**
- Added **Stripe Customer Portal** button on `/billing`.
- Webhook now refreshes subscription details and records:
  - `cancel_at_period_end`, `cancel_at`, `canceled_at`, `current_period_end`
- UI messaging on `/billing`:
  - **Renews on …** (active)
  - **Will be canceled on …** (cancel at period end)
  - **Canceled on …** (fully canceled)
- `/premium` remains feature-gated by `feature_flags.premium`.

**Dev notes**
- Keep Stripe CLI running in dev:
  ```powershell
  stripe listen --forward-to localhost:8080/api/webhooks/stripe
  # put the printed whsec_... into .env as STRIPE_WEBHOOK_SECRET
  docker compose up -d --force-recreate api-blue

* Test:

  1. `/billing` → **Manage billing (portal)** → cancel at period end.
  2. See `customer.subscription.updated` forwarded (HTTP 200) in CLI.
  3. Refresh `/billing` → **Will be canceled on …**.
  4. Undo cancel → message switches back to **Renews on …**.

### ✅ M4 — Zero-downtime Blue/Green deploys (GHCR + Docker Compose)

**Pipeline**
- GitHub Actions builds & pushes:
  - `ghcr.io/<owner>/<repo>-api:<sha>` (+ `:latest`)
  - `ghcr.io/<owner>/<repo>-web:<sha>` (+ `:latest`)

**Local deploy (zero-downtime)**
- Start **green** next to **blue** with new images
- Health-check green (`/api/health` and web `/`)
- (Optional) run DB migrations when green is healthy
- Flip traffic by reloading `edge` with `ACTIVE_COLOR=green`
- One-command rollback to blue

**Commands**
```powershell
# Deploy green
./scripts/deploy.ps1 -Color green `
  -ApiImage ghcr.io/<owner>/<repo>-api:<sha> `
  -WebImage ghcr.io/<owner>/<repo>-web:<sha>

# Optional migrations
./scripts/deploy.ps1 -Color green -ApiImage ... -WebImage ... -RunMigrations

# Rollback
./scripts/rollback.ps1 -ToColor blue

### ✅ M4b — Post-switch smoke test & auto confidence
- `scripts/deploy.ps1` deploys GREEN, flips edge, and (optionally) runs `scripts/smoke.ps1`.
- Smoke checks `/api/health` and `/` via the edge (http://localhost:8080).
- Rollback script still available for manual flips.

**Deploy with smoke**
```powershell
./scripts/deploy.ps1 -ApiImage ghcr.io/<owner>/launchpad-api:latest -WebImage ghcr.io/<owner>/launchpad-web:latest -Smoke

**Rollback**

```powershell
./scripts/rollback.ps1 -ToColor blue
```

---

#### Required env (test mode)

Add to `.env` (not `.env.example`):

```env
APP_URL=http://localhost:8080
STRIPE_SECRET_KEY=sk_test_xxx          # Stripe Dashboard → Developers → API keys
STRIPE_PRICE_ID=price_xxx              # Products → your test product price
STRIPE_WEBHOOK_SECRET=whsec_xxx        # from Stripe CLI (see below). Leave blank only if simulating.
```

> After editing:
> `docker compose up -d --force-recreate api-blue`

---

#### Webhooks (dev) — Stripe CLI **must be running**

```powershell
# one-time install/login
winget install Stripe.StripeCLI
stripe login

# run listener (keep this window open)
stripe listen --forward-to localhost:8080/api/webhooks/stripe
```

Copy the printed **`whsec_…`**, place it in `.env` as `STRIPE_WEBHOOK_SECRET`, then restart API:

```powershell
docker compose up -d --force-recreate api-blue
```

> Note: every time you restart `stripe listen`, the **whsec** changes. Update `.env` and force-recreate the API.

---

#### Quick verify (UI path)

1. Open `http://localhost:8080/billing` → sign in if prompted.
2. Click **Subscribe (test mode)** → Stripe page → pay with `4242 4242 4242 4242` (any future date/CVC/ZIP).
3. Watch the Stripe CLI window for `checkout.session.completed` / `customer.subscription.*` with **200**.
4. Refresh `/billing` → **Premium: ON** and subscription id visible.

---

#### Quick verify (API path)

```powershell
# Login
$tok = (Invoke-RestMethod -Method Post http://localhost:8080/api/auth/login `
  -ContentType application/json `
  -Body (@{ email="admin@acme.test"; password="admin123!" } | ConvertTo-Json)).token

# Create checkout session (returns long URL)
$resp = Invoke-RestMethod -Method Post http://localhost:8080/api/billing/checkout `
  -Headers @{ Authorization = "Bearer $tok" }
$resp | ConvertTo-Json -Depth 5
Start-Process $resp.url

# After successful payment + webhook delivery
Invoke-RestMethod http://localhost:8080/api/billing/status `
  -Headers @{ Authorization = "Bearer $tok" }
# → subscription row + flags.premium = true
```

---

#### Troubleshooting

* **Stripe page says “Something went wrong”** → URL was truncated. Use:

  ```powershell
  $resp.url | Set-Clipboard; Start-Process $resp.url
  ```
* **/billing shows 401 or “Failed to load status”** → sign in again; the page auto-redirects on 401.
* **Premium stays OFF** → ensure Stripe CLI is running, `STRIPE_WEBHOOK_SECRET` matches current listener, and API was force-recreated.
  Inspect:

  ```powershell
  docker compose logs api-blue -n 200 | Select-String stripe
  ```
* **Edge 503 during load tests** → rate-limit was hit; slow the loop or exempt `/api/health` in nginx.

---

#### (If you need to re-apply the M3 migration manually)

```powershell
$u = (Select-String -Path .env -Pattern '^POSTGRES_USER=').Line.Split('=')[1]
$db = (Select-String -Path .env -Pattern '^POSTGRES_DB=').Line.Split('=')[1]
docker compose cp infra/postgres/init/004_billing.sql postgres:/tmp/004_billing.sql
docker compose exec -T postgres psql -U $u -d $db -v ON_ERROR_STOP=1 -f /tmp/004_billing.sql
```
---

## Project structure (key parts)

```
LaunchPad/
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ app.module.ts, health.controller.ts, otel.ts
│  │  │  ├─ auth.controller.ts, jwt.guard.ts, db.ts
│  │  │  ├─ me.controller.ts, orgs.controller.ts
│  │  ├─ Dockerfile, package.json, tsconfig.json
│  └─ web/
│     ├─ src/app/
│     │  ├─ api/auth/[...nextauth]/route.ts
│     │  ├─ admin/layout.tsx        # M1c
│     │  ├─ admin/page.tsx          # M1c
│     │  ├─ admin/profile/page.tsx  # M1c
│     │  ├─ signin/page.tsx, layout.tsx, page.tsx
│     ├─ src/components/providers.tsx
│     ├─ src/lib/auth.ts, src/lib/api.ts  # M1c
│     ├─ Dockerfile, package.json, tsconfig.json
├─ edge/
│  ├─ nginx.conf.template  # routes /api/auth/* -> web, others /api/* -> api
│  ├─ entrypoint.sh, Dockerfile
├─ infra/
│  ├─ postgres/init/001_init.sql, 002_schema.sql
│  ├─ otel-collector.yaml, prometheus.yml
│  └─ grafana/provisioning/datasources/datasource.yml
├─ .github/workflows/ci.yml
├─ .env.example
├─ docker-compose.yml
└─ README.md
```

---

## Environment

Copy once per fresh clone:

```powershell
Copy-Item .env.example .env
```

Key variables:

* `ACTIVE_COLOR=blue|green` – which color edge routes to.
* `POSTGRES_*` – dev DB credentials.
* `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` – traces.
* `API_OTEL_PROM_PORT=9464` – API metrics.
* `JWT_SECRET` – HMAC secret for API JWTs.
* `NEXTAUTH_SECRET`, `NEXTAUTH_URL=http://localhost:8080` – NextAuth.
* `API_INTERNAL_URL` (web services) – `http://api-blue:3001` / `http://api-green:3001`.

---

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`
Checks out → copies `.env.example` → `docker compose up -d --build` → polls `http://localhost:8080/api/health` until healthy; uploads logs on failure. Triggers on push/PR to `main`.

---

## Troubleshooting

```powershell
docker compose ps
docker compose logs edge -n 100
docker compose logs api-blue -n 100
docker compose logs web-blue -n 150
```

* **404 at `/api/auth/*`** → ensure `nginx.conf.template` routes it to `web` and uses `proxy_pass http://web_upstream$request_uri;`.
* **500 from `/api/orgs`** → ensure `db.ts` uses `set_config('app.tenant_id', $1, true)` (not `SET LOCAL ... $1`).
* **Edge “host not found”** → rebuild edge to strip CRLF and ensure health-gated `depends_on`.

---

## Roadmap

* **M4b:** A tiny **post-switch smoke test** (e2e ping + roll back automatically on failure)
* **M5:** Zero-downtime blue/green deploy via GitHub Actions with health/migration gates.
* **M6:** Hardening (pagination, optimistic concurrency, edge rate limiting & circuit breakers), Jest/Playwright tests.

---

## License

MIT — see `LICENSE`.
