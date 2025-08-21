import "./globals.css";
import Providers from "../components/providers";

export const metadata = { title: "LaunchPad" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="mx-auto max-w-6xl p-6">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
