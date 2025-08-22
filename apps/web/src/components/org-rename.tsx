"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function OrgRename({
  id,
  initialName,
  version
}: { id: string; initialName: string; version: number }) {
  const { data: session } = useSession();
  const token =
    (session as any)?.apiToken ||
    (session as any)?.accessToken ||
    (session as any)?.user?.apiToken ||
    (session as any)?.user?.accessToken;

  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!token) return signIn(undefined, { callbackUrl: "/admin" });
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/orgs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "If-Match": `W/"${version}"`
        },
        body: JSON.stringify({ name })
      });
      if (r.status === 401) return signIn(undefined, { callbackUrl: "/admin" });
      if (r.status === 412) {
        setMsg("Someone edited this org before you. Refresh and try again.");
        return;
      }
      if (!r.ok) throw new Error(`status ${r.status}`);
      // success → reload to reflect new version
      location.reload();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input
        className="w-64"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Organization name"
      />
      <button
        onClick={submit}
        disabled={busy || !name.trim()}
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Rename"}
      </button>
      {msg && <span className="text-sm text-red-400">{msg}</span>}
    </div>
  );
}
