"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const token = (session as any)?.apiToken as string | undefined;

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">
          {process.env.NEXT_PUBLIC_APP_NAME || "LaunchPad"}
        </h1>
        <p className="text-slate-400">Docker-first SaaS starter. Use the links below.</p>

        {status === "loading" ? (
          <p className="text-slate-400">Loading session…</p>
        ) : token ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-400">
              Signed in as <code>{session?.user?.email}</code>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              Sign out
            </button>
            <a className="text-sky-400 hover:underline" href="/admin">Open Admin →</a>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => signIn(undefined, { callbackUrl: "/" })}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              Sign in
            </button>
            <a className="text-sky-400 hover:underline" href="/signin">Use /signin</a>
          </div>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <li className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <a className="block hover:underline" href="/api/health" target="_blank" rel="noreferrer">
            API health
          </a>
          <p className="text-sm text-slate-400">Edge → API JSON</p>
        </li>
        <li className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <a className="block hover:underline" href="http://localhost:9090" target="_blank" rel="noreferrer">
            Prometheus
          </a>
          <p className="text-sm text-slate-400">/metrics exported by API</p>
        </li>
        <li className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <a className="block hover:underline" href="http://localhost:3002" target="_blank" rel="noreferrer">
            Grafana
          </a>
          <p className="text-sm text-slate-400">Pre-provisioned datasource</p>
        </li>
        <li className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <a className="block hover:underline" href="http://localhost:1080" target="_blank" rel="noreferrer">
            MailDev
          </a>
          <p className="text-sm text-slate-400">Test email inbox</p>
        </li>
        <li className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <a className="block hover:underline" href="/billing">Billing</a>
          <p className="text-sm text-slate-400">Stripe test-mode checkout</p>
        </li>
        <li className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <a className="block hover:underline" href="/premium">Premium demo</a>
          <p className="text-sm text-slate-400">403 until subscribed</p>
        </li>
      </ul>
    </section>
  );
}
