"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { createMyProfile, getMyProfile, UserRole } from "../../lib/profile";
import { ensureMyCustomerOrg } from "../../lib/customers";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);

      try {
        const profile = await getMyProfile();
        if (profile?.role) setRole(profile.role as UserRole);
      } catch (e: any) {
        setErr(e.message ?? "Error loading profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function chooseRole(r: UserRole) {
    setErr(null);
    try {
      await createMyProfile(r);
      setRole(r);

      if (r === "customer") {
        await ensureMyCustomerOrg();
        router.push("/customer/settings");
        return;
      }

      if (r === "contractor") {
        router.push("/contractor");
        return;
      }

      if (r === "admin") {
        router.push("/admin");
        return;
      }
    } catch (e: any) {
      setErr(e.message ?? "Error creating profile");
    }
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <a className="underline" href="/logout">
          Logout
        </a>
      </div>

      <p className="mt-4">
        You are logged in as: <b>{email ?? "..."}</b>
      </p>

      {loading && <p className="mt-4">Loading...</p>}
      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      {!loading && !role && (
        <div className="mt-6 rounded border p-4">
          <p className="font-medium">Choose your role (one-time for now):</p>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded bg-black px-4 py-2 text-white"
              onClick={() => chooseRole("customer")}
            >
              I am a Customer
            </button>
            <button
              className="rounded bg-black px-4 py-2 text-white"
              onClick={() => chooseRole("contractor")}
            >
              I am a Contractor
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Admin role we’ll set manually in Supabase.
          </p>
        </div>
      )}

      {!loading && role && (
        <div className="mt-6 rounded border p-4">
          <p>
            Your role: <b>{role}</b>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {role === "customer" && (
              <a
                className="rounded bg-black px-4 py-2 text-white"
                href="/customer/settings"
              >
                Go to Customer settings
              </a>
            )}

            {role === "contractor" && (
              <a className="rounded bg-black px-4 py-2 text-white" href="/contractor">
                Go to Contractor cabinet
              </a>
            )}

            {role === "admin" && (
              <a className="rounded bg-black px-4 py-2 text-white" href="/admin">
                Go to Admin panel
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
