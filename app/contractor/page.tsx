"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";

export default function ContractorPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/login");

      const profile = await getMyProfile();
      if (!profile || profile.role !== "contractor") return router.replace("/dashboard");
    })();
  }, [router]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Contractor кабинет</h1>
      <p className="mt-2 text-gray-600">
        Next: company profile → teams → members → documents.
      </p>
      <a className="mt-4 inline-block underline" href="/dashboard">Back</a>
    </main>
  );
}
