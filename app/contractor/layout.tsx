"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ContractorSidebar from "../../components/ContractorSidebar";
import { normalizeError } from "../../lib/errors/normalizeError";
import { withErrorLogging } from "../../lib/errors/withErrorLogging";
import { getMyProfile } from "../../lib/profile";
import { getMyCompany } from "../../lib/contractor";
import { supabase } from "../../lib/supabaseClient";

type ContractorAccessState =
  | "checking"
  | "onboarding"
  | "pending"
  | "approved";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type ContractorLayoutProfile = {
  role?: string | null;
} | null;

type ContractorLayoutCompany = {
  onboarding_status?: string | null;
} | null;

function getSafeContractorLayoutErrorMessage(error: unknown) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return "Unable to load contractor workspace. Please refresh and try again.";
}

function normalizeOnboardingStatus(status: string | null | undefined) {
  const value = String(status || "").toLowerCase();

  if (value === "approved") return "approved";
  if (value === "submitted") return "submitted";
  if (value === "rejected") return "rejected";
  return "draft";
}

export default function ContractorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [accessState, setAccessState] = useState<ContractorAccessState>("checking");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const isOnboardingRoute = useMemo(
    () => pathname === "/contractor/onboarding",
    [pathname]
  );

  const isPendingRoute = useMemo(
    () => pathname === "/contractor/onboarding/pending",
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
            message: "contractor_layout_session_load_failed",
            code: "contractor_layout_session_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: pathname,
          }
        );

        if (!mounted) return;

        if (!sessionResult.data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = (await withErrorLogging(
          async () => (await getMyProfile()) as ContractorLayoutProfile,
          {
            message: "contractor_layout_profile_load_failed",
            code: "contractor_layout_profile_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: pathname,
          }
        )) as ContractorLayoutProfile;

        if (!mounted) return;

        if (!profile || profile.role !== "contractor") {
          router.replace("/dashboard");
          return;
        }

        const company = (await withErrorLogging(
          async () => (await getMyCompany()) as ContractorLayoutCompany,
          {
            message: "contractor_layout_company_load_failed",
            code: "contractor_layout_company_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: pathname,
          }
        )) as ContractorLayoutCompany;

        if (!mounted) return;

        if (!company) {
          setAccessState("onboarding");

          if (!isOnboardingRoute) {
            router.replace("/contractor/onboarding");
            return;
          }

          return;
        }

        const onboardingStatus = normalizeOnboardingStatus(
          company.onboarding_status
        );

        if (onboardingStatus === "approved") {
          setAccessState("approved");

          if (isOnboardingRoute || isPendingRoute) {
            router.replace("/contractor");
            return;
          }

          return;
        }

        if (onboardingStatus === "submitted") {
          setAccessState("pending");

          if (!isPendingRoute) {
            router.replace("/contractor/onboarding/pending");
            return;
          }

          return;
        }

        setAccessState("onboarding");

        if (!isOnboardingRoute) {
          router.replace("/contractor/onboarding");
          return;
        }
      } catch (error) {
        if (!mounted) return;
        setErr(getSafeContractorLayoutErrorMessage(error));
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
  }, [isOnboardingRoute, isPendingRoute, pathname, router]);

  if (loading || accessState === "checking") {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">
              Loading contractor workspace...
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

  if (accessState !== "approved") {
    return (
      <main className="min-h-screen bg-[#F4F8FC]">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC]">
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-[260px] shrink-0 md:block">
          <ContractorSidebar />
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}