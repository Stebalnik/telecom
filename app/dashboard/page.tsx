"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { createMyProfile, getMyProfile, UserRole } from "../../lib/profile";
import { ensureMyCustomerOrg } from "../../lib/customers";

type PendingRole = "customer" | "contractor" | null;

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pendingRole, setPendingRole] = useState<PendingRole>(null);
  const [agreeBaseLegal, setAgreeBaseLegal] = useState(false);
  const [agreeRoleLegal, setAgreeRoleLegal] = useState(false);

  const [selectedSupportAmount, setSelectedSupportAmount] = useState<number>(13);
  const [customSupportAmount, setCustomSupportAmount] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

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
        setErr(e.message ?? "Error loading dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  function beginRoleSelection(nextRole: "customer" | "contractor") {
    setPendingRole(nextRole);
    setAgreeBaseLegal(false);
    setAgreeRoleLegal(false);
    setErr(null);
  }

  function resetRoleSelection() {
    setPendingRole(null);
    setAgreeBaseLegal(false);
    setAgreeRoleLegal(false);
    setErr(null);
  }

  async function confirmRole() {
    if (!pendingRole) return;
    if (!agreeBaseLegal || !agreeRoleLegal) return;

    setSavingRole(true);
    setErr(null);

    try {
      await createMyProfile(pendingRole);
      setRole(pendingRole);

      // If createMyProfile currently only writes role,
      // add agreement timestamps in the same function later.
      // For now this page handles the UX gate before role creation.

      if (pendingRole === "customer") {
        await ensureMyCustomerOrg();
        router.push("/customer/settings");
        return;
      }

      if (pendingRole === "contractor") {
        router.push("/contractor");
        return;
      }
    } catch (e: any) {
      setErr(e.message ?? "Error saving role");
    } finally {
      setSavingRole(false);
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

  const finalSupportAmount = useMemo(() => {
    const custom = Number(customSupportAmount);
    if (customSupportAmount.trim() !== "" && Number.isFinite(custom) && custom > 0) {
      return Math.round(custom * 100) / 100;
    }
    return selectedSupportAmount;
  }, [customSupportAmount, selectedSupportAmount]);

  async function handleSupportCheckout() {
    setSupportLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();

      const res = await fetch("/api/checkout/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalSupportAmount,
          email: data.session?.user?.email ?? null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Unable to start checkout");
      }

      if (!json?.url) {
        throw new Error("Stripe checkout URL was not returned");
      }

      window.location.href = json.url;
    } catch (e: any) {
      setErr(e.message ?? "Unable to open support checkout");
      setSupportLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2E5C]">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Choose your workspace, complete required agreements, and continue.
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
          <>
            {!pendingRole ? (
              <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#111827]">
                  Choose your role
                </h2>
                <p className="mt-2 text-sm text-[#4B5563]">
                  Select the workspace you want to use. This is currently a one-time selection.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-2xl border border-[#D9E2EC] bg-white p-5 text-left shadow-sm transition hover:bg-[#F8FAFC]"
                    onClick={() => beginRoleSelection("customer")}
                  >
                    <div className="text-lg font-semibold text-[#0A2E5C]">
                      I am a Customer
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                      Post jobs, manage contractor approvals, and control compliance requirements.
                    </p>
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl border border-[#D9E2EC] bg-white p-5 text-left shadow-sm transition hover:bg-[#F8FAFC]"
                    onClick={() => beginRoleSelection("contractor")}
                  >
                    <div className="text-lg font-semibold text-[#0A2E5C]">
                      I am a Contractor
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                      Build your profile, upload COI and certifications, and bid on jobs.
                    </p>
                  </button>
                </div>

              </section>
            ) : (
              <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {pendingRole === "customer"
                        ? "Customer agreements"
                        : "Contractor agreements"}
                    </h2>
                    <p className="mt-2 text-sm text-[#4B5563]">
                      Please review and accept the required agreements before continuing.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetRoleSelection}
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                  >
                    Back
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="flex items-start gap-3 rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={agreeBaseLegal}
                      onChange={(e) => setAgreeBaseLegal(e.target.checked)}
                    />
                    <span className="text-sm leading-6 text-[#111827]">
                      I agree to the{" "}
                      <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1F6FB5] hover:underline"
                          >
                            Terms of Use
                      </Link>{" "}
                      and{" "}
                      <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1F6FB5] hover:underline"
                          >
                          Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={agreeRoleLegal}
                      onChange={(e) => setAgreeRoleLegal(e.target.checked)}
                    />
                    <span className="text-sm leading-6 text-[#111827]">
                      {pendingRole === "customer" ? (
                        <>
                          I agree to the{" "}
                          <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1F6FB5] hover:underline"
                          >
                            Customer Agreement
                          </Link>
                          .
                        </>
                      ) : (
                        <>
                          I agree to the{" "}
                          <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1F6FB5] hover:underline">
                            Contractor Agreement
                          </Link>
                          .
                        </>
                      )}
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={confirmRole}
                    disabled={savingRole || !agreeBaseLegal || !agreeRoleLegal}
                    className={`rounded-xl px-5 py-3 text-sm font-medium text-white transition ${
                      savingRole || !agreeBaseLegal || !agreeRoleLegal
                        ? "cursor-not-allowed bg-[#9CA3AF]"
                        : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
                    }`}
                  >
                    {savingRole ? "Saving..." : "Agree and continue"}
                  </button>
                </div>
              </section>
            )}
          </>
        ) : null}

        {!loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  Support the project
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                  If you want, you can support LEOTEOR Marketplace with a voluntary one-time payment.
                  The suggested support amount is $13, but you can choose any amount.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {[13, 25, 50].map((amount) => {
                    const active =
                      customSupportAmount.trim() === "" && selectedSupportAmount === amount;

                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setSelectedSupportAmount(amount);
                          setCustomSupportAmount("");
                        }}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-[#1F6FB5] text-white"
                            : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        ${amount}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 max-w-xs">
                  <label className="mb-2 block text-sm font-medium text-[#111827]">
                    Custom amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Enter any amount"
                    value={customSupportAmount}
                    onChange={(e) => setCustomSupportAmount(e.target.value)}
                    className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-5">
                <div className="text-sm text-[#4B5563]">Selected support</div>
                <div className="mt-2 text-3xl font-semibold text-[#0A2E5C]">
                  ${finalSupportAmount.toFixed(2)}
                </div>

                <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                  This opens a secure Stripe Checkout page for a one-time payment.
                </p>

                <button
                  type="button"
                  onClick={handleSupportCheckout}
                  disabled={supportLoading || !Number.isFinite(finalSupportAmount) || finalSupportAmount <= 0}
                  className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition ${
                    supportLoading || !Number.isFinite(finalSupportAmount) || finalSupportAmount <= 0
                      ? "cursor-not-allowed bg-[#9CA3AF]"
                      : "bg-[#2EA3FF] hover:bg-[#1F6FB5]"
                  }`}
                >
                  {supportLoading ? "Opening checkout..." : "Support via Stripe"}
                </button>
              </div>
            </div>
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