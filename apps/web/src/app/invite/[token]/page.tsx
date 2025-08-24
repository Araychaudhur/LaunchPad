"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`/api/invites/verify?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const txt = await r.text();
        if (!mounted) return;

        if (r.ok) {
          const j = JSON.parse(txt);
          setEmail(j.email ?? null);
          setVerifyError(null);
        } else {
          try {
            const j = JSON.parse(txt);
            setVerifyError(j.message || txt || `status ${r.status}`);
          } catch {
            setVerifyError(txt || `status ${r.status}`);
          }
        }
      } catch (e: any) {
        if (!mounted) return;
        setVerifyError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      const r = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const txt = await r.text();
      if (!r.ok) {
        try {
          const j = JSON.parse(txt);
          setSubmitError(j.message || txt || `status ${r.status}`);
        } catch {
          setSubmitError(txt || `status ${r.status}`);
        }
        return;
      }
      window.location.href = "/";
    } catch (e: any) {
      setSubmitError(e?.message || String(e));
    }
  };

  return (
    <div className="max-w-lg mx-auto py-12">
      <h1 className="text-xl font-semibold mb-6">Accept invite</h1>

      {loading && <p className="opacity-70 mb-4">Loading…</p>}

      {verifyError ? (
        <div className="rounded border border-red-600/40 bg-red-900/10 p-4 text-red-300 mb-6">
          {verifyError}
        </div>
      ) : (
        <>
          {email && (
            <p className="opacity-70 mb-4">
              Invited email: <span className="font-mono">{email}</span>
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Your name</label>
              <input
                className="w-full rounded bg-gray-900/40 border border-gray-700 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Set password</label>
              <input
                type="password"
                className="w-full rounded bg-gray-900/40 border border-gray-700 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="rounded bg-gray-800 hover:bg-gray-700 border border-gray-600 px-4 py-2">
              Create account
            </button>

            {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
          </form>
        </>
      )}
    </div>
  );
}
