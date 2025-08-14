import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.apiToken as string | undefined;

  if (!token) {
    return (
      <main style={{ fontFamily: "sans-serif", padding: 24 }}>
        <h1>Admin</h1>
        <p>You are not signed in. <a href="/signin">Sign in</a></p>
      </main>
    );
  }

  const res = await fetch(`${process.env.API_INTERNAL_URL}/orgs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const orgs = await res.json();

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Admin</h1>
      <h2>Your orgs</h2>
      <pre>{JSON.stringify(orgs, null, 2)}</pre>
    </main>
  );
}
