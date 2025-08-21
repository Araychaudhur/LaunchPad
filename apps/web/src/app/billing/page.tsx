"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

type BillingStatus = {
  subscription?: {
    stripe_subscription_id?: string;
    status?: string;                // "active" | "trialing" | "canceled" | "incomplete" | "past_due" | "unpaid" | etc.
    current_period_end?: string;    // ISO string
    cancel_at?: string;             // ISO string (optional)
  };
  flags?: { premium?: boolean };
};

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        setStatus(await res.json());
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  const goCheckout = async () => {
    try {
      setBusy(true);
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  };

  const openPortal = async () => {
    try {
      setBusy(true);
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  };

  const sub = status?.subscription;
  const premium = !!status?.flags?.premium;

  // If your API sets "status" to something like "canceled" with current_period_end in the future,
  // show a “will be canceled on …” message.
  const willCancel =
    sub?.status?.includes("cancel") || sub?.status === "canceled"
      ? sub?.current_period_end
      : undefined;

  const renewOn = !willCancel ? sub?.current_period_end : undefined;

  return (
    <div className="stack">
      <h1>Billing</h1>
      <p>
        Premium: <strong>{premium ? "ON" : "OFF"}</strong>
      </p>

      {sub?.stripe_subscription_id && (
        <p>
          Sub: <code>{sub.stripe_subscription_id}</code> — {sub.status ?? "unknown"}
        </p>
      )}

      {renewOn && <p>Renews on: {new Date(renewOn).toLocaleString()}</p>}
      {willCancel && <p>Will be canceled on: {new Date(willCancel).toLocaleString()}</p>}

      {err && <p className="error">Failed to load status: {err}</p>}

      <div className="cta-row">
        <button className="btn" onClick={goCheckout} disabled={busy}>
          Subscribe (test mode)
        </button>
        <button className="btn" onClick={openPortal} disabled={busy}>
          Manage billing (portal)
        </button>
        <a className="btn ghost" href="/premium">
          View premium demo →
        </a>
      </div>
    </div>
  );
}
