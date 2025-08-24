"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Audit = {
  id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  meta?: any;
  created_at: string;
};

export default function AuditList({
  initialItems,
  initialCursor
}: { initialItems: Audit[]; initialCursor: string | null }) {
  const { data: session } = useSession();
  const token =
    (session as any)?.apiToken ||
    (session as any)?.accessToken ||
    (session as any)?.user?.apiToken ||
    (session as any)?.user?.accessToken;

  const [items, setItems] = useState<Audit[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadMore = async () => {
    if (!token) return signIn(undefined, { callbackUrl: "/admin/audit" });
    if (!cursor) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/audit-logs?limit=10&before=${encodeURIComponent(cursor)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
      });
      if (r.status === 401) return signIn(undefined, { callbackUrl: "/admin/audit" });
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      setItems((prev) => [...prev, ...(data.items || [])]);
      setCursor(data.nextCursor ?? null);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">{a.action}</span>
              <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
            </div>
            <div className="text-xs text-slate-400">
              {a.resource}{a.resource_id ? `:${a.resource_id}` : ""}
            </div>
            {a.meta && (
              <pre className="mt-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-xs">
                {JSON.stringify(a.meta, null, 2)}
              </pre>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-400">
            No audit logs yet.
          </li>
        )}
      </ul>

      {err && <p className="text-sm text-red-400">{err}</p>}

      <div className="pt-2">
        <button
          onClick={loadMore}
          disabled={busy || !cursor}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-60"
        >
          {cursor ? (busy ? "Loading…" : "Load more") : "No more results"}
        </button>
      </div>
    </div>
  );
}
