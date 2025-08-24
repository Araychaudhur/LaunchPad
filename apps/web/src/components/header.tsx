"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();
  const email = (session as any)?.user?.email as string | undefined;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight text-slate-200">
          {process.env.NEXT_PUBLIC_APP_NAME || "LaunchPad"}
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
          <Link className="hover:text-white" href="/admin">Admin</Link>
          <Link className="hover:text-white" href="/billing">Billing</Link>
          <Link className="hover:text-white" href="/premium">Premium</Link>
        </nav>

        <div className="flex items-center gap-2">
          {status === "loading" ? (
            <span className="text-xs text-slate-400">Loading…</span>
          ) : email ? (
            <>
              <span className="hidden text-xs text-slate-400 md:inline">{email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn(undefined, { callbackUrl: "/" })}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
