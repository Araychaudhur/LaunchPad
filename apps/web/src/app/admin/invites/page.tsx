"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Org = { id: string; name: string };
type Invite = {
  token: string; email: string; role: "MEMBER" | "ADMIN";
  org_id: string; invited_by?: string; accepted_at?: string | null;
  expires_at: string; created_at: string;
};

function tokenFrom(session: any) {
  return (
    session?.apiToken ||
    session?.accessToken ||
    session?.user?.apiToken ||
    session?.user?.accessToken
  );
}

export default function InvitesPage() {
  const { data: session } = useSession();
  const token = tokenFrom(session);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [orgId, setOrgId] = useState<string>("");
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const signedIn = !!token;

  useEffect(() => {
  (async () => {
    try {
      // Orgs via server route
      const orgRes = await fetch("/internal/orgs", { cache: "no-store" });
      if (orgRes.ok) {
        const orgsData: Org[] = await orgRes.json();
        setOrgs(orgsData);
        if (!orgId && orgsData[0]?.id) setOrgId(orgsData[0].id);
      } else if (orgRes.status === 401) {
        setErr("Please sign in to manage invites.");
      } else if (!orgRes.ok) {
        setErr(`orgs: status ${orgRes.status}`);
      }

      // Invites list via server route; 401/403 come back as [] now.
      const invRes = await fetch("/internal/invites/list", { cache: "no-store" });
      if (invRes.ok) {
        setInvites(await invRes.json());
      }
      // Clear any prior invite error on successful fetch
      setErr(null);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);



  const onSend = async (e: React.FormEvent) => {
  e.preventDefault();
  setErr(null);
  setLastUrl(null);
  try {
    if (!email) throw new Error("email required");
    if (!orgId) throw new Error("pick an organization");
    const r = await fetch("/internal/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orgId, role })
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data = await r.json();
    setLastUrl(data.url);
    // refresh list
    const inv = await fetch("/internal/invites/list", { cache: "no-store" });
    setInvites(inv.ok ? await inv.json() : []);
    setEmail("");
  } catch (e: any) {
    setErr(e?.message || String(e));
  }
};

  if (!signedIn) {
    return (
      <main style={{ fontFamily: "sans-serif", padding: 24 }}>
        <h1>Invites</h1>
        <p>You need to sign in.</p>
        <button onClick={() => signIn(undefined, { callbackUrl: "/admin/invites" })}>Sign in</button>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Invites</h1>

      <form onSubmit={onSend} style={{ display: "grid", gap: 12, maxWidth: 560, margin: "12px 0 24px" }}>
        <label>
          Email
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Role
          <select value={role} onChange={e => setRole(e.target.value as any)} style={{ padding: 8 }}>
            <option value="MEMBER">MEMBER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>

        <label>
          Organization
          <select value={orgId} onChange={e => setOrgId(e.target.value)} style={{ padding: 8 }}>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>

        <button type="submit" style={{ padding: 10 }}>Send invite</button>
        {lastUrl && (
          <p style={{ margin: 0 }}>
            Invite URL (also emailed): <a href={lastUrl}>{lastUrl}</a>
          </p>
        )}
      </form>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <h2>Pending invites</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {invites.length === 0 ? <p>No invites yet.</p> :
          invites.map(i => (
            <div key={i.token} style={{ border: "1px solid #333", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <b>{i.email}</b> — {i.role} · org: <code>{i.org_id}</code>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    expires {new Date(i.expires_at).toLocaleString()}
                    {i.accepted_at && <> · accepted {new Date(i.accepted_at).toLocaleString()}</>}
                  </div>
                </div>
                <a href={`/invite/${i.token}`} target="_blank" rel="noreferrer">Open link</a>
              </div>
            </div>
          ))
        }
      </div>

      <p style={{ marginTop: 24 }}>
        Tip: Open <a href="http://localhost:1080" target="_blank">MailDev</a> to see the invite email.
      </p>
    </main>
  );
}
