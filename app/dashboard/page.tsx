"use client";

import LogoutButton from "../../components/LogoutButton";
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!data.session?.user) {
          router.replace("/login");
          return;
        }

        setEmail(data.session.user.email ?? null);

        const profile = await getMyProfile();

        if (!mounted) return;

        if (profile?.role) {
          const r = profile.role as UserRole;
          setRole(r);

          if (r === "customer") {
            router.replace("/customer");
            return;
          }

          if (r === "contractor") {
            router.replace("/contractor");
            return;
          }

          if (r === "admin") {
            router.replace("/admin");
            return;
          }
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(e.message ?? "Error loading profile");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
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

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (e: any) {
      setErr(e.message ?? "Error during logout");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Manage your account and continue to the correct workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm text-[#4B5563]">Logged in as</div>
            <div className="mt-1 text-base font-medium text-[#111827]">
              {email ?? "..."}
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">Loading dashboard...</p>
          </section>
        ) : null}

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        {!loading && !role ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">
              Choose your role
            </h2>
            <p className="mt-2 text-sm text-[#4B5563]">
              Select the workspace you want to use. This is currently a one-time
              selection.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                onClick={() => chooseRole("customer")}
              >
                I am a Customer
              </button>

              <button
                type="button"
                className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                onClick={() => chooseRole("contractor")}
              >
                I am a Contractor
              </button>
            </div>

            <p className="mt-4 text-sm text-[#6B7280]">
              Admin role is assigned manually in Supabase.
            </p>
          </section>
        ) : null}

        {!loading && role ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">
              Your workspace
            </h2>

            <p className="mt-2 text-sm text-[#4B5563]">
              Current role: <span className="font-medium text-[#111827]">{role}</span>
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {role === "customer" ? (
                <a
                  className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                  href="/customer/settings"
                >
                  Go to Customer settings
                </a>
              ) : null}

              {role === "contractor" ? (
                <a
                  className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                  href="/contractor"
                >
                  Go to Contractor cabinet
                </a>
              ) : null}

              {role === "admin" ? (
                <a
                  className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                  href="/admin"
                >
                  Go to Admin panel
                </a>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}