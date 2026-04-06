"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/customer" },
  { label: "Jobs", href: "/customer/jobs" },
  { label: "Bids", href: "/customer/bids" },
  { label: "Contractors", href: "/customer/contractors" },
  { label: "Contractor Resources", href: "/customer/resources" },
  { label: "Agreements", href: "/customer/agreements" },
  { label: "Requests", href: "/customer/requests" },
  { label: "Feedback", href: "/feedback" },
  { label: "Settings", href: "/customer/settings" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/customer") return pathname === "/customer";
  if (href === "/feedback") return pathname === "/feedback";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CustomerSidebar() {
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
              Customer workspace
            </div>
            <div className="truncate text-sm font-semibold text-[#0A2E5C]">
              Telecom Marketplace
            </div>
          </div>
        </Link>
      </div>

      <nav className="mt-4 space-y-1">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

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