"use client";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";

export default function CreateOrgButton() {
  const { data: session } = useSession();
  const token =
    (session as any)?.apiToken ||
    (session as any)?.accessToken ||
    (session as any)?.user?.apiToken ||
    (session as any)?.user?.accessToken;

  const [busy, setBusy] = useState(false);

  const click = async () => {
    if (!token) return signIn(undefined, { callbackUrl: "/admin" });
    setBusy(true);
    try {
      const name = `Demo Org ${new Date().toLocaleTimeString()}`;
      const r = await fetch("/api/orgs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (r.status === 403) {
        alert("Insufficient role to create org.");
        return;
      }
      if (!r.ok) throw new Error(`status ${r.status}`);
      location.reload(); // show the new org
    } catch (e: any) {
      alert(e?.message || e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={click}
      disabled={busy}
      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-60"
    >
      {busy ? "Creating…" : "Create sample org"}
    </button>
  );
}
