"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/browser";
import { getMyProfile } from "../../lib/profile";
import { getMyCustomerOrg } from "../../lib/customers";
import CustomerSidebar from "../../components/CustomerSidebar";

type NavItem = {
  label: string;
  href: string;
};

type CustomerOrgLike = {
  onboarding_status?: string | null;
} | null;

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

function isCustomerOnboardingRoute(pathname: string) {
  return pathname === "/customer/onboarding";
}

function isCustomerPendingRoute(pathname: string) {
  return pathname === "/customer/onboarding/pending";
}

function isCustomerSetupRoute(pathname: string) {
  return (
    isCustomerOnboardingRoute(pathname) || isCustomerPendingRoute(pathname)
  );
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
  const [workspaceReady, setWorkspaceReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      setChecking(true);
      setErr(null);
      setWorkspaceReady(false);

      try {
        const { data, error } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          throw error;
        }

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

        const customerOrg = (await getMyCustomerOrg()) as CustomerOrgLike;

        if (!active) return;

        if (!customerOrg) {
          if (!isCustomerOnboardingRoute(pathname)) {
            router.replace("/customer/onboarding");
            return;
          }

          setWorkspaceReady(false);
          return;
        }

        const onboardingStatus = String(
          customerOrg.onboarding_status || "draft"
        ).toLowerCase();

        if (onboardingStatus === "approved") {
          if (isCustomerSetupRoute(pathname)) {
            router.replace("/customer");
            return;
          }

          setWorkspaceReady(true);
          return;
        }

        if (onboardingStatus === "submitted") {
          if (!isCustomerPendingRoute(pathname)) {
            router.replace("/customer/onboarding/pending");
            return;
          }

          setWorkspaceReady(false);
          return;
        }

        if (!isCustomerOnboardingRoute(pathname)) {
          router.replace("/customer/onboarding");
          return;
        }

        setWorkspaceReady(false);
      } catch {
        if (!active) return;
        setErr("Unable to load customer workspace. Please try again.");
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkAccess();

    return () => {
      active = false;
    };
  }, [pathname, router]);

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

  if (!workspaceReady && isCustomerSetupRoute(pathname)) {
    return (
      <main className="min-h-screen bg-[#F4F8FC]">
        <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="min-w-0 flex-1">{children}</section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC]">
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-[260px] shrink-0 md:block">
          <CustomerSidebar />
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-6 rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm md:hidden">
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

              <Link
                href="/dashboard"
                className="rounded-xl border border-[#D9E2EC] bg-white px-3 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}