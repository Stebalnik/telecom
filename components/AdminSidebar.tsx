"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Review Center", exact: true },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/contractor-approvals", label: "Contractor Approvals" },
  { href: "/admin/company-change-requests", label: "Company Changes" },
  { href: "/admin/team-change-requests", label: "Team Changes" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:w-72 lg:self-start">
      <div className="border-b border-[#E5EDF5] pb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
          LEOTEOR
        </div>
        <h2 className="mt-2 text-lg font-semibold text-[#0A2E5C]">Admin</h2>
        <p className="mt-1 text-sm text-[#4B5563]">
          Review queue, approvals, and analytics.
        </p>
      </div>

      <nav className="mt-4 space-y-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[#EAF4FF] text-[#0A2E5C] border border-[#BFDBFE]"
                  : "text-[#111827] hover:bg-[#F8FAFC] border border-transparent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-[#E5EDF5] pt-4">
        <Link
          href="/dashboard"
          className="flex items-center rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
        >
          Back to dashboard
        </Link>
      </div>
    </aside>
  );
}