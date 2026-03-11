import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="font-semibold">Telecom Marketplace</div>

        <nav className="flex items-center gap-4 text-sm">
          <Link className="underline" href="/dashboard">
            Dashboard
          </Link>
          <Link className="underline" href="/logout">
            Logout
          </Link>
        </nav>
      </header>

      <div className="min-h-screen">{children}</div>
    </>
  );
}