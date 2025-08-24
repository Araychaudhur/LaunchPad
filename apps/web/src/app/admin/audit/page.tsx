import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import AuditList from "../../../components/audit-list";

export const dynamic = "force-dynamic";

type Audit = {
  id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  meta?: any;
  created_at: string;
};
type Page = { items: Audit[]; nextCursor: string | null };

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.apiToken as string | undefined;
  if (!token) redirect("/signin?callbackUrl=/admin/audit");

  let page: Page = { items: [], nextCursor: null };
  try {
    page = await apiFetch<Page>("/audit-logs?limit=10");
  } catch (_) {
    // render empty; client will show "No audit logs yet."
  }

  return (
    <main className="space-y-4">
      <h2 className="text-lg font-semibold">Audit logs</h2>
      <AuditList initialItems={page.items} initialCursor={page.nextCursor} />
    </main>
  );
}
