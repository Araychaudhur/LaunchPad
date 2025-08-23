"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [ok, setOk] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch(`/api/invites/verify?token=${token}`);
        if (!r.ok) throw new Error(`status ${r.status}`);
        const d = await r.json();
        setEmail(d.email);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, [token]);

  const onAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const r = await fetch(`/api/invites/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password })
      });
      if (!r.ok) throw new Error(`status ${r.status}`);
      setOk(true);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 520 }}>
      <h1>Accept invite</h1>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {ok ? (
        <>
          <p>Success! Your account is ready.</p>
          <p><Link href="/signin">Go sign in</Link></p>
        </>
      ) : (
        <>
          {email ? <p>Invited as <b>{email}</b></p> : <p>Loading…</p>}
          <form onSubmit={onAccept} style={{ display: "grid", gap: 12 }}>
            <label>
              Your name
              <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </label>
            <label>
              Set password
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                     style={{ width: "100%", padding: 8 }} />
            </label>
            <button type="submit" style={{ padding: 10 }}>Create account</button>
          </form>
        </>
      )}
    </main>
  );
}
