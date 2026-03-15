"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import {
  getMyCompany,
  listMyTeamChangeRequestsDetailed,
  type TeamChangeRequestListRow,
} from "../../../lib/contractor";

type CompanyChangeRequestRow = {
  id: string;
  company_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  admin_comment: string | null;
  comment: string | null;
  proposed_legal_name: string | null;
  proposed_dba_name: string | null;
};

type UnifiedRow =
  | {
      kind: "company";
      id: string;
      status: "pending" | "approved" | "rejected";
      created_at: string;
      reviewed_at: string | null;
      admin_note: string | null;
      title: string;
      subtitle: string;
    }
  | {
      kind: "team";
      id: string;
      status: "pending" | "approved" | "rejected";
      created_at: string;
      reviewed_at: string | null;
      admin_note: string | null;
      title: string;
      subtitle: string;
    };

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles =
    status === "approved"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "rejected"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {status}
    </span>
  );
}

export default function ContractorRequestsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [companyRequests, setCompanyRequests] = useState<CompanyChangeRequestRow[]>([]);
  const [teamRequests, setTeamRequests] = useState<TeamChangeRequestListRow[]>([]);

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

      if (!profile || profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const company = await getMyCompany();
      if (!company) {
        setCompanyRequests([]);
        setTeamRequests([]);
        return;
      }

      const [companyResult, teamResult] = await Promise.all([
        supabase
          .from("company_change_requests")
          .select(`
            id,
            company_id,
            status,
            created_at,
            reviewed_at,
            admin_comment,
            comment,
            proposed_legal_name,
            proposed_dba_name
          `)
          .eq("company_id", company.id)
          .order("created_at", { ascending: false }),
        listMyTeamChangeRequestsDetailed(),
      ]);

      if (companyResult.error) {
        throw new Error(companyResult.error.message);
      }

      setCompanyRequests((companyResult.data || []) as CompanyChangeRequestRow[]);
      setTeamRequests(teamResult);
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

    const companyChannel = supabase
      .channel("contractor-company-change-requests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_change_requests" },
        () => scheduleReload()
      )
      .subscribe();

    const teamChannel = supabase
      .channel("contractor-team-change-requests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_change_requests" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(companyChannel);
      supabase.removeChannel(teamChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo<UnifiedRow[]>(() => {
    const companyRows: UnifiedRow[] = companyRequests.map((row) => ({
      kind: "company",
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      admin_note: row.admin_comment,
      title: "Company change request",
      subtitle:
        row.proposed_legal_name || row.proposed_dba_name || row.comment || "Company data update",
    }));

    const teamRows: UnifiedRow[] = teamRequests.map((row) => ({
      kind: "team",
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      reviewed_at: row.updated_at || null,
      admin_note: row.admin_note || null,
      title: `Team change request${row.team_name ? ` · ${row.team_name}` : ""}`,
      subtitle: row.reason,
    }));

    return [...companyRows, ...teamRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [companyRequests, teamRequests]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Change Requests
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              View all company and team change requests from your company, with statuses and admin comments.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/contractor/settings/company"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Company settings
            </Link>

            <Link
              href="/contractor/teams/change-request"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              New team request
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading requests...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && rows.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">No requests yet.</p>
        </section>
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="grid gap-4">
            {rows.map((row) => (
              <div
                key={`${row.kind}-${row.id}`}
                className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
              >
                <div className="grid gap-4 lg:grid-cols-[1.6fr_2fr_1fr_1.4fr_1.4fr] lg:items-center">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                      Type
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#111827]">
                      {row.title}
                    </div>
                    <div className="mt-1 text-xs text-[#6B7280] break-all">
                      ID: {row.id}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                      Details
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#111827]">
                      {row.subtitle}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                      Status
                    </div>
                    <div className="mt-2">
                      <StatusBadge status={row.status} />
                    </div>
                  </div>

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
                      Admin comment
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#111827]">
                      {row.admin_note || "—"}
                    </div>
                    <div className="mt-1 text-xs text-[#6B7280]">
                      Reviewed: {formatDate(row.reviewed_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}