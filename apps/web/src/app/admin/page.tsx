import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import { apiFetch } from "../../lib/api";

type Org = { id: string; name: string };

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.apiToken as string | undefined;
  if (!token) redirect("/signin?callbackUrl=/admin");

  const orgs = await apiFetch<Org[]>("/orgs");

  return (
    <main>
      <h2>Your orgs</h2>
      <ul>
        {orgs.map((o) => (
          <li key={o.id}>
            <code>{o.name}</code> <small style={{ opacity: 0.6 }}>({o.id})</small>
          </li>
        ))}
      </ul>
    </main>
  );
}
