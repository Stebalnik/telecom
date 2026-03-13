"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        await supabase.auth.signOut();
      } finally {
        if (active) {
          router.replace("/login");
          router.refresh();
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-[#D9E2EC] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111827]">Logging out</h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Please wait while we sign you out.
        </p>
      </div>
    </main>
  );
}