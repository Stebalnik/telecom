"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/login");

      const profile = await getMyProfile();
      if (!profile || profile.role !== "admin") return router.replace("/dashboard");
    })();
  }, [router]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Admin panel</h1>
      <p className="mt-2 text-gray-600">
        Next: documents verification queue.
      </p>
      <a className="mt-4 inline-block underline" href="/dashboard">Back</a>
    </main>
  );
}
