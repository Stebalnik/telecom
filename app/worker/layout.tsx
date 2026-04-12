"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { normalizeError } from "../../lib/errors/normalizeError";
import { withErrorLogging } from "../../lib/errors/withErrorLogging";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";

type WorkerNavItem = {
  href: string;
  label: string;
  match?: string[];
};

type WorkerLayoutProfile = {
  role?: string | null;
} | null;

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

const workerNavItems: WorkerNavItem[] = [
  {
    href: "/worker",
    label: "Dashboard",
  },
  {
    href: "/worker/profile",
    label: "Profile",
    match: ["/worker/profile"],
  },
  {
    href: "/worker/certifications",
    label: "Certifications",
    match: ["/worker/certifications"],
  },
  {
    href: "/worker/insurance",
    label: "Insurance",
    match: ["/worker/insurance"],
  },
  {
    href: "/worker/vacancies",
    label: "Vacancies",
    match: ["/worker/vacancies"],
  },
  {
    href: "/worker/applications",
    label: "Applications",
    match: ["/worker/applications"],
  },
  {
    href: "/worker/invitations",
    label: "Invitations",
    match: ["/worker/invitations"],
  },
  {
    href: "/worker/availability",
    label: "Availability",
    match: ["/worker/availability"],
  },
  {
    href: "/feedback",
    label: "Feedback",
    match: ["/feedback"],
  },
];

function pathMatches(pathname: string, href: string) {
  if (href === "/worker") return pathname === href;
  if (href === "/feedback") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, item: WorkerNavItem) {
  if (item.match?.length) {
    return item.match.some((prefix) => pathMatches(pathname, prefix));
  }

  return pathMatches(pathname, item.href);
}

function getSafeWorkerLayoutErrorMessage(error: unknown) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return "Unable to load specialist workspace. Please refresh and try again.";
}

function WorkerSidebar() {
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
              Specialist workspace
            </div>
            <div className="truncate text-sm font-semibold text-[#0A2E5C]">
              Telecom Marketplace
            </div>
          </div>
        </Link>
      </div>

      <nav className="mt-4 space-y-1">
        {workerNavItems.map((item) => {
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

export default function WorkerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const isWorkerRoute = useMemo(
    () => pathname === "/worker" || pathname.startsWith("/worker/"),
    [pathname]
  );

  useEffect(() => {
    let mounted = true;

    async function loadAccess() {
      setLoading(true);
      setErr(null);

      try {
        const sessionResult = await withErrorLogging(
          async () => {
            const result = await supabase.auth.getSession();

            if (result.error) {
              throw result.error;
            }

            return result;
          },
          {
            message: "worker_layout_session_load_failed",
            code: "worker_layout_session_load_failed",
            source: "frontend",
            area: "worker",
            role: "specialist",
            path: pathname,
          }
        );

        if (!mounted) return;

        if (!sessionResult.data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = (await withErrorLogging(
          async () => (await getMyProfile()) as WorkerLayoutProfile,
          {
            message: "worker_layout_profile_load_failed",
            code: "worker_layout_profile_load_failed",
            source: "frontend",
            area: "worker",
            role: "specialist",
            path: pathname,
          }
        )) as WorkerLayoutProfile;

        if (!mounted) return;

        if (!profile?.role) {
          router.replace("/dashboard");
          return;
        }

        if (profile.role !== "specialist") {
          if (profile.role === "customer") {
            router.replace("/customer");
            return;
          }

          if (profile.role === "contractor") {
            router.replace("/contractor");
            return;
          }

          if (profile.role === "admin") {
            router.replace("/admin");
            return;
          }

          router.replace("/dashboard");
          return;
        }

        if (!isWorkerRoute) {
          router.replace("/worker");
          return;
        }
      } catch (error) {
        if (!mounted) return;
        setErr(getSafeWorkerLayoutErrorMessage(error));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadAccess();

    return () => {
      mounted = false;
    };
  }, [isWorkerRoute, pathname, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">
              Loading specialist workspace...
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC]">
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-[260px] shrink-0 md:block">
          <WorkerSidebar />
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}