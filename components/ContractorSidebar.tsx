"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    href: "/contractor/hr",
    label: "HR Center",
    match: ["/contractor/hr"],
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
  { href: "/contractor/teams", label: "My Teams" },
  { href: "/contractor/requests", label: "Active Requests" },
  { href: "/contractor/agreements", label: "Agreements" },
  { href: "/feedback", label: "Feedback" },
  { href: "/contractor/settings/company", label: "Settings" },
];

function pathMatches(pathname: string, href: string) {
  if (href === "/contractor") {
    return pathname === href;
  }

  if (href === "/feedback") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, item: NavItem) {
  if (item.match?.length) {
    return item.match.some((prefix) => pathMatches(pathname, prefix));
  }

  return pathMatches(pathname, item.href);
}

export default function ContractorSidebar() {
  const pathname = usePathname();

  return (
    <div className="sticky top-6 rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#E5EDF5] pb-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="LEOTEOR"
            width={28}
            height={28}
            className="h-7 w-7 rounded object-contain"
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
              Contractor workspace
            </div>
            <div className="truncate text-sm font-semibold text-[#0A2E5C]">
              Telecom Marketplace
            </div>
          </div>
        </Link>
      </div>

      <nav className="mt-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[#EAF3FF] text-[#0A2E5C]"
                  : "text-[#4B5563] hover:bg-[#F4F8FC] hover:text-[#0A2E5C]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="my-2 h-px bg-[#D9E2EC]" />

        <Link
          href="/dashboard"
          className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-[#4B5563] transition hover:bg-[#F4F8FC] hover:text-[#0A2E5C]"
        >
          Back to dashboard
        </Link>
      </nav>
    </div>
  );
}