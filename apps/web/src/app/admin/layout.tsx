import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="border-b border-slate-800 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-xl font-semibold">Admin</h1>
          <nav className="flex gap-4 text-sm text-slate-300">
            <Link className="hover:text-white" href="/admin">Orgs</Link>
            <Link className="hover:text-white" href="/admin/profile">Profile</Link>
            <Link className="hover:text-white" href="/billing">Billing</Link>
          </nav>
        </div>
      </div>
      {children}
    </section>
  );
}
