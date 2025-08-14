# LaunchPad – Multi-tenant SaaS Skeleton (Docker-first)

![ci](https://github.com/Araychaudhur/LaunchPad/actions/workflows/ci.yml/badge.svg?branch=main)

A bootable starter for a production-grade, multi-tenant SaaS: **Next.js (web)**, **NestJS (API)**, **Postgres**, **Redis**, **Nginx edge**, and **Observability** (OpenTelemetry → Collector, Prometheus, Grafana). Fully containerized for **Windows + VSCode** with **Docker only** (no Node or pnpm required on host).

> This README covers the **M0 bootable skeleton**. Upcoming milestones (M1+) will add multitenancy (RLS), Auth.js, Stripe (test), admin console, SLOs, and blue/green deploy automation in GitHub Actions.

---

## Run in 60 seconds (Windows PowerShell)
```powershell
Copy-Item .env.example .env
docker compose up --build
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

## Project structure
```
LaunchPad/
├─ apps/
│  ├─ api/                 # NestJS API (health + OTEL)
│  │  ├─ src/
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

## Services included (M0)
- **edge** – Nginx reverse proxy, **rate limiting** (10 r/s burst 20) and **passive circuit breaker** via `proxy_next_upstream`.
- **web-blue/green** – Next.js app (Dockerized).
- **api-blue/green** – NestJS API with `/health` and OpenTelemetry (traces + Prometheus metrics).
- **postgres** – Postgres 16 with base extensions (`uuid-ossp`, `pgcrypto`).
- **redis** – Redis 7 (future: rate-limit tokens, queues, cache).
- **otel-collector** – Receives traces via OTLP HTTP (4318), logs to console (M0).
- **prometheus** – Scrapes API Prometheus exporter (port 9464).
- **grafana** – Pre-provisioned Prometheus datasource (login: `admin`/`admin`).
- **maildev** – Local email (UI :1080, SMTP :1025) for invites in later milestones.

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

---

## Troubleshooting
Common checks:
```powershell
docker compose ps
docker compose logs edge -n 100
docker compose logs api-blue -n 100
```

- **`edge` up but pages 502/504:** The target service may still be starting. Wait and refresh, or check `api-blue`/`web-blue` logs.
- **Port already in use:** Stop previous stacks: `docker compose down` or free the port (8080, 9090, 3002, 1080, 1025, 5432, 6379).
- **WSL/Docker issues on Windows:** Ensure Docker Desktop is **Running** and WSL 2 is installed (`wsl --status`).

---

## Roadmap (next milestones)
- **M1:** Multitenancy schema + **Postgres RLS**, JWT, **Auth.js (email via MailDev)**, seeded demo tenant, admin console.
- **M2:** RBAC + audit logging middleware.
- **M3:** **Stripe (test mode)** billing, idempotent webhooks, feature flags.
- **M4:** SLOs (P95 latency, error rate) with Prometheus **recording rules** and Grafana dashboards.
- **M5:** Zero-downtime **blue/green deploy** via GitHub Actions with health gates and migration safety checks.
- **M6:** Hardening (pagination, optimistic concurrency, rate limiting, circuit breakers), Jest/Playwright tests.

---

## License
This project is licensed under the **MIT License**. See `LICENSE` for details.
