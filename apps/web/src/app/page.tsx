"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const token = (session as any)?.apiToken as string | undefined;

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>{process.env.NEXT_PUBLIC_APP_NAME || "LaunchPad"}</h1>
      <p>Web is up. Use the links below.</p>

      {status === "loading" ? (
        <p>Loading session…</p>
      ) : token ? (
        <>
          <p>Signed in as <code>{session?.user?.email}</code></p>
          <button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
          <p style={{ marginTop: 16 }}>
            <a href="/admin" rel="noreferrer">Open Admin page (server fetch)</a>
          </p>
        </>
      ) : (
        <>
          <button onClick={() => signIn(undefined, { callbackUrl: "/" })}>Sign in</button>
          <p>Or go to <a href="/signin">/signin</a></p>
        </>
      )}

      <ul style={{ marginTop: 24 }}>
        <li><a href="/api/health" target="_blank" rel="noreferrer">Check API health</a></li>
        <li><a href="http://localhost:9090" target="_blank">Prometheus</a></li>
        <li><a href="http://localhost:3002" target="_blank">Grafana</a></li>
        <li><a href="http://localhost:1080" target="_blank">MailDev</a></li>
      </ul>
    </main>
  );
}
