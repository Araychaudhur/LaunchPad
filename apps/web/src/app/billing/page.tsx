"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Status = { subscription: any | null; flags: { premium: boolean } };

function pickApiToken(session: any | null | undefined): string | undefined {
  if (!session) return undefined;
  return (
    session.apiToken ||
    session.accessToken ||
    session?.user?.apiToken ||
    session?.user?.accessToken
  );
}

export default function BillingPage() {
  const { data: session, status } = useSession();
  const token = pickApiToken(session);

  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load status
  useEffect(() => {
    if (!token) return; // will trigger signIn() below on click / or manual reload after sign-in
    setErr(null);
    (async () => {
      try {
        const r = await fetch("/api/billing/status", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (r.status === 401) {
          // token missing/expired → ask user to sign in again
          signIn(undefined, { callbackUrl: "/billing" });
          return;
        }
        if (!r.ok) throw new Error(`status ${r.status}`);
        setS(await r.json());
      } catch (e: any) {
        setErr(`Failed to load status: ${e?.message || e}`);
      }
    })();
  }, [token]);

  // Start checkout
  const subscribe = async () => {
    if (!token) {
      // not authenticated or token missing → sign in then return
      signIn(undefined, { callbackUrl: "/billing" });
      return;
    }
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) {
        signIn(undefined, { callbackUrl: "/billing" });
        return;
      }
      if (!r.ok) throw new Error(`status ${r.status}`);
      const { url } = await r.json();
      if (!url) throw new Error("No URL in response");
      window.location.href = url;
    } catch (e: any) {
      setErr(`Checkout failed: ${e?.message || e}`);
      setBusy(false);
    }
  };

  if (status === "loading") return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Billing</h1>
      <p>Premium: <b>{s?.flags?.premium ? "ON" : "OFF"}</b></p>
      {s?.subscription && (
        <p>
          Sub: <code>{s.subscription.stripe_subscription_id}</code> — {s.subscription.status}
        </p>
      )}
      <button onClick={subscribe} disabled={busy} style={{ padding: 8, marginTop: 12 }}>
        {busy ? "Redirecting…" : "Subscribe (test mode)"}
      </button>
      {err && <p style={{ color: "red", marginTop: 12 }}>{err}</p>}
    </main>
  );
}
