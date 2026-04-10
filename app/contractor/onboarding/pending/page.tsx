"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeError } from "../../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../../lib/errors/withErrorLogging";
import { getMyProfile } from "../../../../lib/profile";
import { getMyCompany } from "../../../../lib/contractor";
import { supabase } from "../../../../lib/supabaseClient";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type ContractorPendingProfile = {
  role?: string | null;
} | null;

type ContractorPendingCompany = {
  legal_name?: string | null;
  dba_name?: string | null;
  onboarding_status?: string | null;
} | null;

function getSafePendingErrorMessage(error: unknown) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return "Unable to load onboarding status. Please refresh and try again.";
}

export default function ContractorOnboardingPendingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [company, setCompany] = useState<ContractorPendingCompany>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
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
            message: "contractor_pending_session_load_failed",
            code: "contractor_pending_session_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor/onboarding/pending",
          }
        );

        if (!mounted) return;

        if (!sessionResult.data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = (await withErrorLogging(
          async () => (await getMyProfile()) as ContractorPendingProfile,
          {
            message: "contractor_pending_profile_load_failed",
            code: "contractor_pending_profile_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor/onboarding/pending",
          }
        )) as ContractorPendingProfile;

        if (!mounted) return;

        if (!profile || profile.role !== "contractor") {
          router.replace("/dashboard");
          return;
        }

        const currentCompany = (await withErrorLogging(
          async () => (await getMyCompany()) as ContractorPendingCompany,
          {
            message: "contractor_pending_company_load_failed",
            code: "contractor_pending_company_load_failed",
            source: "frontend",
            area: "contractor",
            role: "contractor",
            path: "/contractor/onboarding/pending",
          }
        )) as ContractorPendingCompany;

        if (!mounted) return;

        if (!currentCompany) {
          router.replace("/contractor/onboarding");
          return;
        }

        if (currentCompany.onboarding_status === "approved") {
          router.replace("/contractor");
          return;
        }

        if (
          currentCompany.onboarding_status !== "submitted" &&
          currentCompany.onboarding_status !== "approved"
        ) {
          router.replace("/contractor/onboarding");
          return;
        }

        setCompany(currentCompany);
      } catch (error) {
        if (!mounted) return;
        setErr(getSafePendingErrorMessage(error));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">
            Loading onboarding review status...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
          Contractor onboarding
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
          Your company is under review
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4B5563]">
          We received your contractor onboarding submission. Your workspace will
          unlock after admin approval.
        </p>

        {company ? (
          <div className="mt-6 rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-xs uppercase tracking-wide text-[#4B5563]">
              Submitted company
            </div>
            <div className="mt-1 text-lg font-semibold text-[#111827]">
              {company.legal_name || "Unnamed company"}
              {company.dba_name ? ` · ${company.dba_name}` : ""}
            </div>
            <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              Under review
            </div>
          </div>
        ) : null}
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">
          What happens next
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4">
            <div className="text-sm font-semibold text-[#0A2E5C]">
              1. Admin review
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Our team reviews your submitted company details and onboarding
              status.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4">
            <div className="text-sm font-semibold text-[#0A2E5C]">
              2. Approval decision
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              If approved, your contractor workspace becomes available. If
              returned to draft, you can update and resubmit.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4">
            <div className="text-sm font-semibold text-[#0A2E5C]">
              3. Workspace unlock
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              After approval, you can access jobs, teams, certifications,
              customers, and the rest of the contractor workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">
          How the platform works
        </h2>

        <div className="mt-4 space-y-4 text-sm leading-6 text-[#4B5563]">
          <p>
            LEOTEOR helps contractors organize company data, insurance,
            certifications, teams, customer approvals, and job participation in
            one place.
          </p>
          <p>
            During review, your account stays in a waiting state so the platform
            does not unlock prematurely.
          </p>
          <p>
            Once approved, you will be able to enter the contractor workspace
            and continue the full operating flow.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Back to dashboard
          </Link>

          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
          >
            Refresh status
          </button>
        </div>
      </section>
    </main>
  );
}