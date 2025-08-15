import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { apiFetch } from "../../../lib/api";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.apiToken as string | undefined;
  if (!token) redirect("/signin?callbackUrl=/admin/profile");

  const me = await apiFetch("/me");

  return (
    <main>
      <h2>Profile</h2>
      <pre>{JSON.stringify(me, null, 2)}</pre>
    </main>
  );
}
