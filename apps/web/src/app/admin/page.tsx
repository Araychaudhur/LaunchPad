import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import { apiFetch } from "../../lib/api";
import CreateOrgButton from "../../components/create-org";
import OrgRename from "../../components/org-rename";

export const dynamic = "force-dynamic";

type Org = { id: string; name: string; version: number };

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.apiToken as string | undefined;
  if (!token) redirect("/signin?callbackUrl=/admin");

  let orgs: Org[] = [];
  let error: string | null = null;

  try {
    orgs = await apiFetch<Org[]>("/orgs");
  } catch (e: any) {
    error = e?.message || "Failed to load organizations";
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your orgs</h2>
        <CreateOrgButton />
      </div>

      {error ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
          <div className="text-red-400">Error: {error}</div>
          <div className="mt-1 text-slate-400">
            Check that you are signed in and API is reachable from web.
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {orgs.map((o) => (
            <li key={o.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="font-medium">{o.name}</div>
              <div className="text-xs text-slate-400">{o.id}</div>
              <div className="mt-1 text-xs text-slate-500">v{o.version}</div>
              <OrgRename id={o.id} initialName={o.name} version={o.version} />
            </li>
          ))}
          {orgs.length === 0 && (
            <li className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
              No organizations found.
            </li>
          )}
        </ul>
      )}
    </main>
  );
}
