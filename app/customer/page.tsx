"use client";
<a className="underline" href="/customer/jobs">My jobs</a>

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
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Customer кабинет</h1>
      <p className="mt-2 text-gray-600">
        Next: create Job, set requirements, view bids.
      </p>
      <a className="mt-4 inline-block underline" href="/dashboard">Back</a>
    </main>
  );
}
