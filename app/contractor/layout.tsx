"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/contractor", label: "Overview" },
  { href: "/contractor/company", label: "Company" },
  { href: "/contractor/insurance", label: "Insurance" },
  { href: "/contractor/coi", label: "COI" },
  { href: "/contractor/teams", label: "Teams" },
  { href: "/contractor/certifications", label: "Certifications" },
  { href: "/contractor/requests", label: "Change Requests" },
  { href: "/contractor/customers", label: "Customers" },
  { href: "/contractor/jobs", label: "Jobs" },
  { href: "/contractor/settings/company", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/contractor") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
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
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
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