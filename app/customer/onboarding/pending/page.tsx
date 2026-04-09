"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase/browser";
import { getMyProfile } from "../../../../lib/profile";
import {
  getMyCustomerOrg,
  isCustomerOnboardingPending,
  isCustomerWorkspaceApproved,
} from "../../../../lib/customers";
import { normalizeError } from "../../../../lib/errors/normalizeError";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

function getSafeErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-[#4B5563]">{children}</div>
    </section>
  );
}

export default function CustomerOnboardingPendingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const sessionResult = await supabase.auth.getSession();

        if (!active) return;

        if (sessionResult.error) {
          throw sessionResult.error;
        }

        if (!sessionResult.data.session?.user) {
          router.replace("/login");
          return;
        }

        const profile = await getMyProfile();

        if (!active) return;

        if (!profile || profile.role !== "customer") {
          router.replace("/dashboard");
          return;
        }

        const org = await getMyCustomerOrg();

        if (!active) return;

        if (!org) {
          router.replace("/customer/onboarding");
          return;
        }

        if (isCustomerWorkspaceApproved(org)) {
          router.replace("/customer");
          return;
        }

        if (!isCustomerOnboardingPending(org)) {
          router.replace("/customer/onboarding");
          return;
        }

        setCompanyName(org.company_name || org.name || "");
      } catch (error) {
        if (!active) return;

        setErr(
          getSafeErrorMessage(
            error,
            "Unable to load onboarding status. Please try again."
          )
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="text-sm text-[#4B5563]">Loading onboarding status...</div>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="LEOTEOR"
              width={24}
              height={24}
              className="h-6 w-6 rounded object-contain"
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
              Customer onboarding
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
            Your application is under review
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
            {companyName
              ? `Your customer account for ${companyName} has been submitted for approval.`
              : "Your customer account has been submitted for approval."}{" "}
            We will notify you by email once your workspace is activated.
          </p>

          <div className="mt-5 rounded-xl border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3 text-sm text-[#0A2E5C]">
            Status: <span className="font-semibold">Submitted for review</span>
          </div>
        </section>

        <InfoCard title="How the platform works">
          <div className="space-y-3">
            <p>
              <span className="font-semibold text-[#111827]">Create jobs:</span>{" "}
              After approval, you will be able to create and publish jobs for telecom work.
            </p>
            <p>
              <span className="font-semibold text-[#111827]">Review bids:</span>{" "}
              Contractors will submit bids, and you will compare and review them in your customer workspace.
            </p>
            <p>
              <span className="font-semibold text-[#111827]">Manage contractors:</span>{" "}
              You will approve contractors, review their documents, and control who can work with your organization.
            </p>
            <p>
              <span className="font-semibold text-[#111827]">Notifications:</span>{" "}
              Notification settings for new bids and workflow activity will be added later.
            </p>
          </div>
        </InfoCard>

        <InfoCard title="While you wait">
          <div className="space-y-3">
            <p>
              Your application is currently with the admin team for activation review.
            </p>
            <p>
              Once approved, these onboarding pages will no longer be shown and your full customer workspace will become available automatically.
            </p>
          </div>
        </InfoCard>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to dashboard
            </Link>

            <Link
              href="/customer/onboarding"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Review submitted details
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}