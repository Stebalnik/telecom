"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";

type ContractorApprovalRow = {
  id: string;
  legal_name: string | null;
  dba_name: string | null;
  status: string | null;
  onboarding_status: string | null;
  created_at: string;
  owner_user_id: string | null;
  block_reason: string | null;
  public_profile:
    | {
        company_id: string;
        is_listed: boolean | null;
        headline: string | null;
        home_market: string | null;
        markets: string[] | null;
      }
    | {
        company_id: string;
        is_listed: boolean | null;
        headline: string | null;
        home_market: string | null;
        markets: string[] | null;
      }[]
    | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({
  status,
  tone = "neutral",
}: {
  status: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const styles =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "info"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-[#D9E2EC] bg-[#F8FAFC] text-[#4B5563]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {status}
    </span>
  );
}

export default function AdminContractorApprovalsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ContractorApprovalRow[]>([]);

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();

      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const { data: companies, error } = await supabase
        .from("contractor_companies")
        .select(`
          id,
          legal_name,
          dba_name,
          status,
          onboarding_status,
          created_at,
          owner_user_id,
          block_reason,
          public_profile:contractor_public_profiles (
            company_id,
            is_listed,
            headline,
            home_market,
            markets
          )
        `)
        .eq("onboarding_status", "submitted")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      setRows((companies || []) as ContractorApprovalRow[]);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadPage();
      }, 300);
    };

    const companiesChannel = supabase
      .channel("admin-contractor-approvals-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contractor_companies" },
        () => scheduleReload()
      )
      .subscribe();

    const profileChannel = supabase
      .channel("admin-contractor-public-profiles-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contractor_public_profiles" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(companiesChannel);
      supabase.removeChannel(profileChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approveCompany(companyId: string, hasPublicProfile: boolean) {
    setBusyId(companyId);
    setErr(null);

    try {
      const { error: companyErr } = await supabase
        .from("contractor_companies")
        .update({
          onboarding_status: "approved",
        })
        .eq("id", companyId);

      if (companyErr) throw new Error(companyErr.message);

      if (hasPublicProfile) {
        const { error: profileErr } = await supabase
          .from("contractor_public_profiles")
          .update({
            is_listed: true,
          })
          .eq("company_id", companyId);

        if (profileErr) throw new Error(profileErr.message);
      }

      await loadPage();
    } catch (e: any) {
      setErr(e.message ?? "Approve error");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectCompany(companyId: string) {
    setBusyId(companyId);
    setErr(null);

    try {
      const { error } = await supabase
        .from("contractor_companies")
        .update({
          onboarding_status: "draft",
        })
        .eq("id", companyId);

      if (error) throw new Error(error.message);

      await loadPage();
    } catch (e: any) {
      setErr(e.message ?? "Reject error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                Contractor approvals
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Review submitted contractor onboardings and approve them for marketplace visibility.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">Loading contractor approvals...</p>
          </section>
        ) : null}

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        {!loading && rows.length === 0 ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">No submitted contractors waiting for approval.</p>
          </section>
        ) : null}

        {!loading && rows.length > 0 ? (
          <section className="grid gap-4">
            {rows.map((row) => {
              const publicProfile = Array.isArray(row.public_profile)
                ? row.public_profile[0] ?? null
                : row.public_profile;

              const isBusy = busyId === row.id;

              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#111827]">
                          {row.legal_name || "Unnamed company"}
                        </h2>

                        <StatusBadge
                          status={row.onboarding_status || "unknown"}
                          tone="warning"
                        />

                        <StatusBadge
                          status={row.status || "unknown"}
                          tone="info"
                        />

                        <StatusBadge
                          status={publicProfile?.is_listed ? "listed" : "not listed"}
                          tone={publicProfile?.is_listed ? "success" : "neutral"}
                        />
                      </div>

                      {row.dba_name ? (
                        <p className="mt-2 text-sm text-[#4B5563]">
                          DBA: {row.dba_name}
                        </p>
                      ) : null}

                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Created
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {formatDate(row.created_at)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Home market
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {publicProfile?.home_market || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Headline
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {publicProfile?.headline || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Public profile
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {publicProfile ? "Exists" : "Missing"}
                          </div>
                        </div>
                      </div>

                      {row.block_reason ? (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          Block reason: {row.block_reason}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => approveCompany(row.id, !!publicProfile)}
                        className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? "Processing..." : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => rejectCompany(row.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Return to draft
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}