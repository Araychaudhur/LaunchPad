import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ fontFamily: "sans-serif", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Admin</h1>
        <nav style={{ display: "flex", gap: 12 }}>
          <Link href="/admin">Orgs</Link>
          <Link href="/admin/profile">Profile</Link>
          <Link href="/">Home</Link>
        </nav>
      </header>
      <hr style={{ margin: "12px 0 24px" }} />
      {children}
    </section>
  );
}
