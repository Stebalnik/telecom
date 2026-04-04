"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  match?: string[];
};

const navItems: NavItem[] = [
  { href: "/contractor", label: "Dashboard" },
  { href: "/contractor/jobs", label: "Jobs" },
  { href: "/contractor/bids", label: "Bids" },
  {
    href: "/contractor/customers",
    label: "Customers",
    match: ["/contractor/customers"],
  },
  {
    href: "/contractor/resources",
    label: "Resources",
    match: ["/contractor/resources"],
  },
  {
    href: "/contractor/company",
    label: "My Data",
    match: [
      "/contractor/company",
      "/contractor/insurance",
      "/contractor/coi",
      "/contractor/certifications",
    ],
  },
  { href: "/contractor/teams", label: "My teams"},
  { href: "/contractor/requests", label: "Active Requests" },
  { href: "/contractor/agreements", label: "Agreements"},
  { href: "/contractor/settings/company", label: "Settings" },
];

function pathMatches(pathname: string, href: string) {
  if (href === "/contractor") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, item: NavItem) {
  if (item.match && item.match.length > 0) {
    return item.match.some((prefix) => pathMatches(pathname, prefix));
  }
  return pathMatches(pathname, item.href);
}

export default function ContractorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F4F8FC]">
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#D9E2EC] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#D9E2EC] px-4 py-4">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="LEOTEOR"
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded object-contain"
                />
                <div>
                  <div className="text-sm font-semibold text-[#0A2E5C]">
                    LEOTEOR
                  </div>
                  <div className="text-xs text-[#4B5563]">Contractor Portal</div>
                </div>
              </Link>
            </div>

            <nav className="flex flex-col gap-1 p-3">
              {navItems.map((item) => {
                const active = isActive(pathname, item);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={[
                      "rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-[#EAF3FF] text-[#0A2E5C]"
                        : "text-[#4B5563] hover:bg-[#F4F8FC] hover:text-[#0A2E5C]",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="my-2 h-px bg-[#D9E2EC]" />

              <Link
                href="/dashboard"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#4B5563] transition hover:bg-[#F4F8FC] hover:text-[#0A2E5C]"
              >
                Back to dashboard
              </Link>
            </nav>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}