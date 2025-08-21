"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

export default function PremiumDemo() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setIsPremium(!!data?.flags?.premium);
      } catch {
        setIsPremium(false);
      }
    })();
  }, []);

  if (isPremium === null) return <p>Loading…</p>;

  if (!isPremium) {
    return (
      <div className="stack">
        <h1>Premium demo</h1>
        <p className="muted">
          This page requires an active premium subscription. Subscribe from the billing
          page to unlock premium features.
        </p>
        <a className="btn primary" href="/billing">Go to billing</a>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Premium demo</h1>
      <p>🎉 You have premium access. Imagine feature flags unlocking advanced functionality here.</p>
    </div>
  );
}
