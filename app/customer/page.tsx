"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";

export default function CustomerPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
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
        setErr(e.message ?? "Access check error");
      } finally {
        if (active) setChecking(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading customer cabinet...</p>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-[#111827]">
              Customer cabinet
            </h1>
            <a className="text-sm underline" href="/dashboard">
              Back
            </a>
          </div>

          <p className="mt-3 text-sm text-[#4B5563]">
            Create jobs, configure requirements and manage contractor approvals.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">Jobs</h2>
            <p className="mt-2 text-sm text-[#4B5563]">
              Create new projects and manage bids.
            </p>

            <div className="mt-4 grid gap-2">
              <a
                className="block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                href="/customer/jobs/new"
              >
                Create job
              </a>
              <a
                className="block rounded-xl border border-[#D9E2EC] px-4 py-2.5 text-center text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                href="/customer/jobs/active"
              >
                Active jobs
              </a>
              <a
                className="block rounded-xl border border-[#D9E2EC] px-4 py-2.5 text-center text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                href="/customer/jobs/archive"
              >
                Archived jobs
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">Contractors</h2>
            <p className="mt-2 text-sm text-[#4B5563]">
              Manage vendors and view COI.
            </p>

            <div className="mt-4 grid gap-2">
              <a
                className="block rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                href="/customer/contractors/approved"
              >
                Approved contractors
              </a>
              <a
                className="block rounded-xl border border-[#D9E2EC] px-4 py-2.5 text-center text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                href="/customer/contractors/all"
              >
                All contractors on platform
              </a>
            </div>

            <div className="pt-4">
              <a className="text-sm underline" href="/customer/settings">
                Settings (requirements)
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}