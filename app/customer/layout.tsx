"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getMyProfile } from "../../lib/profile";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/customer" },
  { label: "Jobs", href: "/customer/jobs" },
  { label: "Bids", href: "/customer/bids" },
  { label: "Contractors", href: "/customer/contractors" },
  { label: "Compliance", href: "/customer/compliance" },
  { label: "Agreements", href: "/customer/agreements" },
  { label: "Requests", href: "/customer/requests" },
  { label: "Settings", href: "/customer/settings" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/customer") return pathname === "/customer";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      setChecking(true);
      setErr(null);

      try {
        const { data } = await supabase.auth.getSession();

        if (!active) return;

        if (!data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = await getMyProfile();

        if (!active) return;

        if (!profile || profile.role !== "customer") {
          router.replace("/dashboard");
          return;
        }
      } catch (e: any) {
        if (!active) return;
        setErr(e?.message || "Access check error");
      } finally {
        if (active) setChecking(false);
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  const activeItem = useMemo(
    () => navItems.find((item) => isActivePath(pathname, item.href)),
    [pathname]
  );

  if (checking) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading customer workspace...</p>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC]">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-6 rounded-2xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#E5EDF5] pb-4">
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
            </nav>

            
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-6 rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm lg:hidden">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="LEOTEOR"
                width={28}
                height={28}
                className="h-7 w-7 rounded object-contain"
              />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                  Customer workspace
                </div>
                <div className="text-sm font-semibold text-[#0A2E5C]">
                  {activeItem?.label || "Customer"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-[#1F6FB5] text-white"
                        : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}