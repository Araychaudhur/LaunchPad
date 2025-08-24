import "./globals.css";
import Providers from "../components/providers";
import Header from "../components/header";

export const metadata = { title: "LaunchPad" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main className="mx-auto max-w-6xl p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
