"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignIn() {
  const [email, setEmail] = useState("admin@acme.test");
  const [password, setPassword] = useState("admin123!");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/",
      redirect: true
    });
    // next-auth handles redirect; if it returns, an error probably occurred
    if (res?.error) setError(res.error);
  };

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>Email <input value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password <input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button type="submit">Sign in</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </main>
  );
}
