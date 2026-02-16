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

    {/* Actions */}
    <div className="grid gap-4 md:grid-cols-2">
      {/* Jobs */}
      <div className="rounded border p-5 space-y-3">
        <h2 className="text-lg font-semibold">Jobs</h2>
        <p className="text-sm text-gray-600">
          Create new projects and manage bids.
        </p>

        <a
          className="block rounded bg-black px-4 py-2 text-white text-center"
          href="/customer/jobs"
        >
          Create / Manage Jobs
        </a>
      </div>

      {/* Settings */}
      <div className="rounded border p-5 space-y-3">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-gray-600">
          Configure insurance limits and certification requirements.
        </p>

        <a
          className="block rounded bg-black px-4 py-2 text-white text-center"
          href="/customer/settings"
        >
          Settings (Requirements)
        </a>

        <a
  className="block rounded bg-black px-4 py-2 text-white text-center"
  href="/customer/contractors"
>
  Approved Contractors
</a>


      </div>
    </div>
  </main>
);

}
