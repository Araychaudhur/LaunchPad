"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Sub = {
  stripe_subscription_id: string;
  status: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  cancel_at?: string;
  canceled_at?: string;
};
type Status = { subscription: Sub | null; flags: { premium: boolean } };

function tokenFrom(session: any) {
  return (
    session?.apiToken ||
    session?.accessToken ||
    session?.user?.apiToken ||
    session?.user?.accessToken
  );
}
function format(dt?: string | Date | null) {
  if (!dt) return "";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toLocaleString();
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const token = tokenFrom(session);

  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setErr(null);
    (async () => {
      try {
        const r = await fetch("/api/billing/status", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (r.status === 401) return signIn(undefined, { callbackUrl: "/billing" });
        if (!r.ok) throw new Error(`status ${r.status}`);
        setS(await r.json());
      } catch (e: any) {
        setErr(`Failed to load status: ${e?.message || e}`);
      }
    })();
  }, [token]);

  const subscribe = async () => {
    if (!token) return signIn(undefined, { callbackUrl: "/billing" });
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) return signIn(undefined, { callbackUrl: "/billing" });
      if (!r.ok) throw new Error(`status ${r.status}`);
      const { url } = await r.json();
      if (!url) throw new Error("No URL in response");
      window.location.href = url;
    } catch (e: any) {
      setErr(`Checkout failed: ${e?.message || e}`);
      setBusy(false);
    }
  };

  const openPortal = async () => {
    if (!token) return signIn(undefined, { callbackUrl: "/billing" });
    try {
      const r = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) return signIn(undefined, { callbackUrl: "/billing" });
      const { url, error } = await r.json();
      if (url) window.location.href = url;
      else alert(error || "Could not open portal");
    } catch (e: any) {
      alert(e?.message || e);
    }
  };

  if (status === "loading") return <main style={{ padding: 24 }}>Loading…</main>;

  const sub = s?.subscription;
  const premium = !!s?.flags?.premium;

  let line2 = "";
  if (sub) {
    if (premium && sub.cancel_at_period_end) {
      // FALLBACK: if current_period_end is missing, show cancel_at
      const when = sub.current_period_end || sub.cancel_at;
      line2 = `Will be canceled on: ${format(when)}`;
    } else if (premium) {
      line2 = `Renews on: ${format(sub.current_period_end)}`;
    } else if (sub.canceled_at) {
      line2 = `Canceled on: ${format(sub.canceled_at)}`;
    } else if (sub.cancel_at) {
      line2 = `Will cancel on: ${format(sub.cancel_at)}`;
    }
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Billing</h1>
      <p>Premium: <b>{premium ? "ON" : "OFF"}</b></p>
      {sub && (
        <>
          <p>
            Sub: <code>{sub.stripe_subscription_id}</code> — {sub.status}
          </p>
          {line2 && <p>{line2}</p>}
        </>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button onClick={subscribe} disabled={busy} style={{ padding: 8 }}>
          {busy ? "Redirecting…" : "Subscribe (test mode)"}
        </button>
        <button onClick={openPortal} style={{ padding: 8 }}>
          Manage billing (portal)
        </button>
        <a href="/premium" style={{ alignSelf: "center" }}>View premium demo →</a>
      </div>

      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}
    </main>
  );
}
