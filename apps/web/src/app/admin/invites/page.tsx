"use client";

import { useEffect, useState } from "react";

type Org = { id: string; name: string };
type Invite = {
  token: string;
  email: string;
  role: "MEMBER" | "ADMIN";
  org_id: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
};

export default function AdminInvites() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const [orgRes, invRes] = await Promise.all([
      fetch("/internal/orgs", { cache: "no-store" }),
      fetch("/internal/invites/list", { cache: "no-store" })
    ]);
    if (orgRes.ok) {
      const og: Org[] = await orgRes.json();
      setOrgs(og);
      if (!orgId && og[0]?.id) setOrgId(og[0].id);
    }
    if (invRes.ok) setInvites(await invRes.json());
  }

  useEffect(() => {
    refresh().catch(e => setErr(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLastUrl(null);
    if (!email) return setErr("email required");
    if (!orgId) return setErr("pick an organization");
    setLoading(true);
    try {
      const r = await fetch("/internal/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orgId, role })
      });
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      setLastUrl(data.url);
      setEmail("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const doResend = async (token: string) => {
    setErr(null);
    const r = await fetch("/internal/invites/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (!r.ok) setErr(`resend: status ${r.status}`);
  };

  const doRevoke = async (token: string) => {
    setErr(null);
    const r = await fetch("/internal/invites/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (!r.ok) setErr(`revoke: status ${r.status}`);
    await refresh();
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-xl font-semibold mb-6">Admin</h1>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-3">Invites</h2>

        <form onSubmit={onSend} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded bg-gray-900/40 border border-gray-700 px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm mb-1">Role</label>
              <select
                className="w-full rounded bg-gray-900/40 border border-gray-700 px-3 py-2"
                value={role}
                onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm mb-1">Organization</label>
              <select
                className="w-full rounded bg-gray-900/40 border border-gray-700 px-3 py-2"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="rounded bg-gray-800 hover:bg-gray-700 border border-gray-600 px-4 py-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send invite"}
          </button>
        </form>

        {lastUrl && (
          <p className="mt-3 text-sm">
            <span className="opacity-70">Invite URL (also emailed): </span>
            <a className="text-sky-400 underline break-all" href={lastUrl}>
              {lastUrl}
            </a>
          </p>
        )}

        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
      </section>

      <section>
        <h3 className="text-md font-medium mb-2">Pending invites</h3>
        {invites.length === 0 ? (
          <p className="opacity-70">No invites yet.</p>
        ) : (
          <ul className="space-y-2">
            {invites.map((iv) => (
              <li key={iv.token} className="rounded border border-gray-700 p-3 bg-gray-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-mono">{iv.email}</div>
                    <div className="opacity-70">
                      {iv.role} • {iv.status}
                      {iv.accepted_at ? ` • accepted ${new Date(iv.accepted_at).toLocaleString()}` : ""}
                      {iv.revoked_at ? ` • revoked ${new Date(iv.revoked_at).toLocaleString()}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      className="text-sky-400 underline text-sm"
                      href={`/invite/${iv.token}`}
                      target="_blank"
                    >
                      Open link
                    </a>
                    {iv.status === "pending" && (
                      <>
                        <button
                          className="text-sm rounded border border-gray-600 px-2 py-1 hover:bg-gray-800"
                          onClick={() => doResend(iv.token)}
                        >
                          Resend
                        </button>
                        <button
                          className="text-sm rounded border border-red-600 px-2 py-1 hover:bg-red-800/30"
                          onClick={() => doRevoke(iv.token)}
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-sm opacity-70">
        Tip: Open <a className="text-sky-400 underline" href="http://localhost:1080" target="_blank">MailDev</a> to
        see the invite email.
      </p>
    </div>
  );
}
