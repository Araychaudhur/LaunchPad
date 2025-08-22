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
    <main className="space-y-3">
      <h2 className="text-lg font-semibold">Profile</h2>
      <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        {JSON.stringify(me, null, 2)}
      </pre>
    </main>
  );
}
