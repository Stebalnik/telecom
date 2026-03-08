"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";

export default function CustomerPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/login");

      const profile = await getMyProfile();
      if (!profile || profile.role !== "customer") return router.replace("/dashboard");
    })();
  }, [router]);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customer cabinet</h1>
        <a className="underline text-sm" href="/dashboard">
          Back
        </a>
      </div>

      <p className="text-sm text-gray-600">
        Create jobs, configure requirements and manage contractor approvals.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Jobs */}
        <div className="rounded border p-5 space-y-3">
          <h2 className="text-lg font-semibold">Jobs</h2>
          <p className="text-sm text-gray-600">
            Create new projects and manage bids.
          </p>

          <div className="grid gap-2">
            <a className="block rounded bg-black px-4 py-2 text-white text-center" href="/customer/jobs/new">
              Create job
            </a>
            <a className="block rounded border px-4 py-2 text-center" href="/customer/jobs/active">
              Active jobs
            </a>
            <a className="block rounded border px-4 py-2 text-center" href="/customer/jobs/archive">
              Archived jobs
            </a>
          </div>
        </div>

        {/* Contractors */}
        <div className="rounded border p-5 space-y-3">
          <h2 className="text-lg font-semibold">Contractors</h2>
          <p className="text-sm text-gray-600">
            Manage vendors and view COI.
          </p>

          <div className="grid gap-2">
            <a className="block rounded bg-black px-4 py-2 text-white text-center" href="/customer/contractors/approved">
              Approved contractors
            </a>
            <a className="block rounded border px-4 py-2 text-center" href="/customer/contractors/all">
              All contractors on platform
            </a>
          </div>

          <div className="pt-2">
            <a className="underline text-sm" href="/customer/settings">
              Settings (requirements)
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}