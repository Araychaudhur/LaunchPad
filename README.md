# LaunchPad – Multi-tenant SaaS Skeleton (Docker-first)

![ci](https://github.com/Araychaudhur/LaunchPad/actions/workflows/ci.yml/badge.svg?branch=main)

A bootable starter for a production-grade, multi-tenant SaaS: **Next.js (web)**, **NestJS (API)**, **Postgres**, **Redis**, **Nginx edge**, and **Observability** (OpenTelemetry → Collector, Prometheus, Grafana). Fully containerized for **Windows + VSCode** with **Docker only** (no Node or pnpm required on host).

> **This README documents M1a** (after M0). What’s included now: **multitenancy schema**, **Postgres RLS**, **seeded demo tenant**, **JWT login**, and **tenant-scoped APIs** (`/api/me`, `/api/orgs`).

---

## Run in 60 seconds (Windows PowerShell)
```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

### Open these in your browser
- App: http://localhost:8080/
- API health: http://localhost:8080/api/health
- Prometheus: http://localhost:9090/
- Grafana: http://localhost:3002/ (admin/admin)
- MailDev: http://localhost:1080/

If a page doesn't load immediately, wait ~10–20 seconds and refresh (containers are starting).

---

## Blue/Green demo (local)
Bring up identical green services and switch traffic without downtime.

```powershell
# Start green alongside blue
docker compose --profile green up -d --build api-green web-green

# Switch traffic to green
$env:ACTIVE_COLOR = "green"
docker compose up -d edge
```

Switch back by setting `ACTIVE_COLOR="blue"` and restarting the `edge` service.

---

## What’s new in **M1a**
- **Postgres schema**: tenants, users, orgs, memberships.
- **Row Level Security (RLS)**: enforced via per-request GUCs (`app.tenant_id`, `app.user_id`) so queries are **tenant-scoped** automatically.
- **Seeded demo data**: tenant `Acme`, org `Acme HQ`, admin user `admin@acme.test` / `admin123!`.
- **JWT auth**:
  - `POST /api/auth/login` → `{ token }` (HS256; 1d).
  - `GET /api/me` (JWT) → user + tenant ids.
  - `GET /api/orgs` (JWT) → orgs visible to the logged-in tenant (RLS enforced).

---

## API Quick Verify (PowerShell)
```powershell
# 1) Login to obtain a JWT
$body = @{ email = "admin@acme.test"; password = "admin123!" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login -ContentType "application/json" -Body $body
$token = $login.token

# 2) Inspect your identity
Invoke-RestMethod -Uri http://localhost:8080/api/me -Headers @{ Authorization = "Bearer $token" }

# 3) List orgs for your tenant (RLS applied)
Invoke-RestMethod -Uri http://localhost:8080/api/orgs -Headers @{ Authorization = "Bearer $token" }
```
**Demo creds:** `admin@acme.test` / `admin123!`

Equivalent with `curl`:
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login   -H "content-type: application/json"   -d '{"email":"admin@acme.test","password":"admin123!"}' | jq -r .token)

curl -s http://localhost:8080/api/me   -H "authorization: Bearer $TOKEN" | jq
curl -s http://localhost:8080/api/orgs -H "authorization: Bearer $TOKEN" | jq
```

---

## Project structure
```
LaunchPad/
├─ apps/
│  ├─ api/                 # NestJS API (health, auth, me, orgs, OTEL)
│  │  ├─ src/
│  │  │  ├─ app.module.ts
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ db.ts
│  │  │  ├─ health.controller.ts
│  │  │  ├─ jwt.guard.ts
│  │  │  ├─ me.controller.ts
│  │  │  ├─ orgs.controller.ts
│  │  │  └─ otel.ts
│  │  ├─ Dockerfile
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  └─ web/                 # Next.js app
│     ├─ src/app/
│     ├─ Dockerfile
│     ├─ package.json
│     └─ tsconfig.json
├─ edge/                   # Nginx reverse proxy (rate limiting, passive CB)
│  ├─ Dockerfile
│  ├─ entrypoint.sh
│  └─ nginx.conf.template
├─ infra/
│  ├─ grafana/provisioning/datasources/datasource.yml
│  ├─ postgres/init/001_init.sql
│  ├─ postgres/init/002_schema.sql        # <-- M1a schema + seed
│  ├─ otel-collector.yaml
│  └─ prometheus.yml
├─ .github/workflows/ci.yml
├─ .env.example
├─ docker-compose.yml
├─ .gitattributes
├─ .gitignore
├─ LICENSE  (MIT)
└─ README.md
```

---

## Environment
The `.env.example` file configures ports and credentials. Copy it once per fresh clone:

```powershell
Copy-Item .env.example .env
```

Key variables:
- `ACTIVE_COLOR=blue|green` – which color the **edge** routes to.
- `POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB` – dev credentials.
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` – trace export.
- `API_OTEL_PROM_PORT=9464` – API metrics scrape port.
- `JWT_SECRET` – HMAC secret for JWTs (default in `.env.example` is dev-only).

---

## CI (GitHub Actions)
Workflow: `.github/workflows/ci.yml`

What it does:
1. Checks out the repo.
2. Copies `.env.example` → `.env`.
3. Builds and starts the Docker stack in CI.
4. Polls `http://localhost:8080/api/health` until healthy (or fails and prints logs).

Triggers: **push to `main`** and **pull requests**.

> Later milestones will add test jobs (Jest/Playwright), Docker image caching, and blue/green deploy gating.

---

## Services included (M1a)
- **edge** – Nginx reverse proxy, **rate limiting** (10 r/s burst 20) and **passive circuit breaker** via `proxy_next_upstream`.
- **web-blue/green** – Next.js app (Dockerized).
- **api-blue/green** – NestJS API (`/health`, `/auth/login`, `/me`, `/orgs`) with **OpenTelemetry traces** + **Prometheus metrics**.
- **postgres** – Postgres 16 with extensions (`uuid-ossp`, `pgcrypto`), **RLS policies** and **seed data**.
- **redis** – Redis 7 (future: rate-limit tokens, queues, cache).
- **otel-collector** – Receives traces via OTLP HTTP (4318), logs to console.
- **prometheus** – Scrapes API Prometheus exporter (port 9464).
- **grafana** – Pre-provisioned Prometheus datasource (login: `admin`/`admin`).
- **maildev** – Local email (UI :1080, SMTP :1025) for invites in later milestones.

---

## Troubleshooting
Common checks:
```powershell
docker compose ps
docker compose logs edge -n 100
docker compose logs api-blue -n 100
```

- **401 from /me or /orgs** → make sure you included the `Authorization: Bearer <token>` header; re-login to refresh the token.
- **500 from /orgs** → ensure `infra/postgres/init/002_schema.sql` exists and that `db.ts` uses `set_config('app.tenant_id', $1, true)` (not `SET LOCAL ... $1`).
- **WSL/Docker issues on Windows** → ensure Docker Desktop is **Running** and WSL2 is installed (`wsl --status`).

---

## Roadmap
- **M1b:** Auth.js (NextAuth) Email provider via MailDev + Next.js UI login, session ↔ JWT bridge, minimal admin console page.
- **M2:** RBAC + audit logging middleware.
- **M3:** Stripe (test) billing, **idempotent webhooks**, feature flags.
- **M4:** SLOs (P95 latency, error rate) with Prometheus **recording rules** and Grafana dashboards.
- **M5:** Zero-downtime **blue/green deploy** via GitHub Actions with health gates and migration safety checks.
- **M6:** Hardening (pagination, optimistic concurrency, edge rate limiting & circuit breakers), Jest/Playwright tests.

---

## License
This project is licensed under the **MIT License**. See `LICENSE` for details.
