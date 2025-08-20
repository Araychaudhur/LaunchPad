"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

function tokenFrom(session: any) {
  return (
    session?.apiToken ||
    session?.accessToken ||
    session?.user?.apiToken ||
    session?.user?.accessToken
  );
}

export default function PremiumDemo() {
  const { data: session } = useSession();
  const token = tokenFrom(session);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch("/api/premium/report", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.status === 401) return signIn(undefined, { callbackUrl: "/premium" });
        if (r.status === 403) { setErr("Premium required — please subscribe."); return; }
        if (!r.ok) throw new Error(`status ${r.status}`);
        setData(await r.json());
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, [token]);

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Premium demo</h1>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      {!token && <button onClick={() => signIn(undefined, { callbackUrl: "/premium" })}>Sign in</button>}
      <p style={{ marginTop: 16 }}>
        Need access? <a href="/billing">Subscribe on the billing page</a>.
      </p>
    </main>
  );
}
