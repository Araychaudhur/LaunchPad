# LaunchPad – Multi-tenant SaaS Skeleton (Docker-first)

![ci](https://github.com/Araychaudhuri/LaunchPad/actions/workflows/ci.yml/badge.svg?branch=main)

A bootable starter for a production-grade, multi-tenant SaaS: **Next.js (web)**, **NestJS (API)**, **Postgres**, **Redis**, **Nginx edge**, and **Observability** (OpenTelemetry → Collector, Prometheus, Grafana). Fully containerized for **Windows + VSCode** with **Docker only**.

---

## Run in 60 seconds (Windows PowerShell)
```powershell
Copy-Item .env.example .env
docker compose up --build -d
````

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

* **M2:** RBAC + audit logging middleware.
* **M3:** Stripe (test) billing, idempotent webhooks, feature flags.
* **M4:** SLOs (P95 latency, error rate) with Prometheus recording rules and Grafana dashboards.
* **M5:** Zero-downtime blue/green deploy via GitHub Actions with health/migration gates.
* **M6:** Hardening (pagination, optimistic concurrency, edge rate limiting & circuit breakers), Jest/Playwright tests.

---

## License

MIT — see `LICENSE`.

````

### Commit & push
```powershell
git add README.md
git commit -m "Docs: progress log through M1c (UI polish: layout, profile, apiFetch)"
git push origin main
````
