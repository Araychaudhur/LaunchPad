export const metadata = {
  title: "LaunchPad",
  description: "Multi-tenant SaaS starter",
};

import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="lp-header">
          <div className="lp-container">
            <Link className="brand" href="/">LaunchPad</Link>
            <nav className="nav">
              <Link href="/admin">Admin</Link>
              <Link href="/billing">Billing</Link>
              <Link href="/premium">Premium demo</Link>
            </nav>
          </div>
        </header>
        <main className="lp-container">{children}</main>
        <footer className="lp-footer">
          <div className="lp-container">
            <span>© {new Date().getFullYear()} LaunchPad</span>
            <nav className="nav">
              <a href="http://localhost:9090" target="_blank">Prometheus</a>
              <a href="http://localhost:3002" target="_blank">Grafana</a>
              <a href="http://localhost:1080" target="_blank">MailDev</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
