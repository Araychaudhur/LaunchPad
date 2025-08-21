import Link from "next/link";
import { cookies } from "next/headers";

async function getMe() {
  try {
    const cookie = cookies().toString();
    const res = await fetch("/api/me", {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { email?: string };
  } catch {
    return null;
  }
}

export default async function Home() {
  const me = await getMe();

  return (
    <>
      <section className="hero">
        <h1>LaunchPad</h1>
        <p className="sub">
          Docker-first SaaS skeleton with multitenancy, RBAC, billing, and observability.
        </p>

        <div className="userrow">
          {me?.email ? (
            <>
              <span className="muted">Signed in as</span>{" "}
              <span className="pill">{me.email}</span>
              <form action="/api/auth/signout" method="post" className="inline">
                <button className="btn" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <span className="muted">You’re not signed in</span>
          )}
        </div>

        <div className="cta-row">
          <Link className="btn primary" href="/admin">Open Admin</Link>
          <Link className="btn" href="/billing">Manage Billing</Link>
          <Link className="btn ghost" href="/premium">View premium demo →</Link>
        </div>
      </section>

      <section className="grid">
        <a className="card" href="/api/health">
          <h3>API health</h3>
          <p>Check NestJS health endpoint routed through edge.</p>
        </a>
        <a className="card" href="http://localhost:9090" target="_blank">
          <h3>Prometheus</h3>
          <p>Explore metrics & SLO queries.</p>
        </a>
        <a className="card" href="http://localhost:3002" target="_blank">
          <h3>Grafana</h3>
          <p>Dashboards for p95 latency & 5xx error rate.</p>
        </a>
        <a className="card" href="http://localhost:1080" target="_blank">
          <h3>MailDev</h3>
          <p>Preview invitation emails locally.</p>
        </a>
      </section>
    </>
  );
}
