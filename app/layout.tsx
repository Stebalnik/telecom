import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Telecom Marketplace",
  description: "Telecom work marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Global header */}
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="font-semibold">Telecom Marketplace</div>

          <nav className="flex items-center gap-4 text-sm">
            <a className="underline" href="/dashboard">
              Dashboard
            </a>
            <a className="underline" href="/logout">
              Logout
            </a>
          </nav>
        </header>

        {/* Page content */}
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
