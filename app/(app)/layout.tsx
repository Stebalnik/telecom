import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-3">
        <div className="text-sm font-semibold text-[#0A2E5C]">
          LEOTEOR Telecom Marketplace
        </div>

        <nav className="flex items-center gap-4 text-sm">
          <Link
            className="font-medium text-[#1F6FB5] hover:underline"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="font-medium text-[#1F6FB5] hover:underline"
            href="/logout"
          >
            Logout
          </Link>
        </nav>
      </header>

      <div className="min-h-screen bg-[#F4F8FC]">{children}</div>
    </>
  );
}