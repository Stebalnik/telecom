"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#1F6FB5] text-white"
          : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
      }`}
    >
      {label}
    </Link>
  );
}

export default function CustomerContractorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
            Contractors
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
            Review approved vendors, browse all contractors on the platform, and
            manage contractor access for your organization.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <TabLink href="/customer/contractors/approved" label="Approved" />
          <TabLink href="/customer/contractors/all" label="All Contractors" />
        </div>
      </section>

      {children}
    </main>
  );
}