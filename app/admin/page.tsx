"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";
import {
  approveDoc,
  listPendingDocs,
  rejectDoc,
  AdminDoc,
} from "../../lib/adminDocs";
import {
  listAdminTeamChangeRequests,
  type TeamChangeRequest,
} from "../../lib/contractor";

type AdminFilter =
  | "all"
  | "documents"
  | "company_changes"
  | "team_changes"
  | "contractor_approvals";

type RequestRow = {
  id: string;
  company_id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  company?: {
    legal_name: string | null;
    dba_name: string | null;
  } | null;
};

type RequestRowDb = {
  id: string;
  company_id: string;
  requested_by: string;
  status: string | null;
  created_at: string;
  reviewed_at: string | null;
  company:
    | {
        legal_name: string | null;
        dba_name: string | null;
      }
    | {
        legal_name: string | null;
        dba_name: string | null;
      }[]
    | null;
};

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

function mapRequestRow(row: RequestRowDb): RequestRow {
  const company = Array.isArray(row.company) ? row.company[0] ?? null : row.company;

  return {
    id: row.id,
    company_id: row.company_id,
    requested_by: row.requested_by,
    status:
      row.status === "approved" || row.status === "rejected"
        ? row.status
        : "pending",
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    company: company
      ? {
          legal_name: company.legal_name,
          dba_name: company.dba_name,
        }
      : null,
  };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({
  status,
  tone,
}: {
  status: "pending" | "approved" | "rejected";
  tone?: "warning" | "success" | "danger";
}) {
  const styles =
    tone === "success" || status === "approved"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "danger" || status === "rejected"
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

function MetaBadge({
  text,
  tone = "neutral",
}: {
  text: string;
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
      {text}
    </span>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#1F6FB5] text-white"
          : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [companyRequests, setCompanyRequests] = useState<RequestRow[]>([]);
  const [teamRequests, setTeamRequests] = useState<TeamChangeRequest[]>([]);
  const [contractorApprovals, setContractorApprovals] = useState<
    ContractorApprovalRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<AdminFilter>("all");
  const [busyDocId, setBusyDocId] = useState<string | null>(null);

  async function load() {
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

      const [
        docsResult,
        requestsResult,
        teamRequestsResult,
        contractorApprovalsResult,
      ] = await Promise.all([
        listPendingDocs(),
        supabase
          .from("company_change_requests")
          .select(`
            id,
            company_id,
            requested_by,
            status,
            created_at,
            reviewed_at,
            company:contractor_companies (
              legal_name,
              dba_name
            )
          `)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        listAdminTeamChangeRequests(),
        supabase
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
          .order("created_at", { ascending: false }),
      ]);

      setDocs(docsResult);

      if (requestsResult.error) {
        throw new Error(requestsResult.error.message);
      }

      if (contractorApprovalsResult.error) {
        throw new Error(contractorApprovalsResult.error.message);
      }

      const normalizedCompanyRequests = (
        (requestsResult.data ?? []) as RequestRowDb[]
      ).map(mapRequestRow);

      setCompanyRequests(normalizedCompanyRequests);
      setTeamRequests(teamRequestsResult.filter((row) => row.status === "pending"));
      setContractorApprovals(
        (contractorApprovalsResult.data ?? []) as ContractorApprovalRow[]
      );
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        load();
      }, 300);
    };

    const docsChannel = supabase
      .channel("admin-documents-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => scheduleReload()
      )
      .subscribe();

    const companyRequestsChannel = supabase
      .channel("admin-company-change-requests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_change_requests" },
        () => scheduleReload()
      )
      .subscribe();

    const teamRequestsChannel = supabase
      .channel("admin-team-change-requests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_change_requests" },
        () => scheduleReload()
      )
      .subscribe();

    const contractorApprovalsChannel = supabase
      .channel("admin-contractor-approvals-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contractor_companies" },
        () => scheduleReload()
      )
      .subscribe();

    const contractorPublicProfilesChannel = supabase
      .channel("admin-contractor-public-profiles-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contractor_public_profiles" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(docsChannel);
      supabase.removeChannel(companyRequestsChannel);
      supabase.removeChannel(teamRequestsChannel);
      supabase.removeChannel(contractorApprovalsChannel);
      supabase.removeChannel(contractorPublicProfilesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onApprove(id: string) {
    setErr(null);
    setBusyDocId(id);

    try {
      await approveDoc(id);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Approve error");
    } finally {
      setBusyDocId(null);
    }
  }

  async function onReject(id: string) {
    setErr(null);
    setBusyDocId(id);

    try {
      await rejectDoc(id, rejectNote[id] || "Rejected");
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Reject error");
    } finally {
      setBusyDocId(null);
    }
  }

  const counts = useMemo(
    () => ({
      documents: docs.length,
      companyChanges: companyRequests.length,
      teamChanges: teamRequests.length,
      contractorApprovals: contractorApprovals.length,
      total:
        docs.length +
        companyRequests.length +
        teamRequests.length +
        contractorApprovals.length,
    }),
    [
      docs.length,
      companyRequests.length,
      teamRequests.length,
      contractorApprovals.length,
    ]
  );

  const showDocuments = filter === "all" || filter === "documents";
  const showCompanyChanges = filter === "all" || filter === "company_changes";
  const showTeamChanges = filter === "all" || filter === "team_changes";
  const showContractorApprovals =
    filter === "all" || filter === "contractor_approvals";

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                Admin review center
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Review pending documents, contractor approvals, contractor company
                change requests, and team change requests.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/contractor-approvals"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                View all contractor approvals
              </Link>

              <Link
                href="/admin/company-change-requests"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                View all company change requests
              </Link>

              <Link
                href="/admin/team-change-requests"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                View all team change requests
              </Link>

              <Link
                href="/dashboard"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
              <div className="text-sm text-[#4B5563]">Total pending</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {counts.total}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
              <div className="text-sm text-[#4B5563]">Documents</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {counts.documents}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
              <div className="text-sm text-[#4B5563]">Contractor approvals</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {counts.contractorApprovals}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
              <div className="text-sm text-[#4B5563]">Company changes</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {counts.companyChanges}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
              <div className="text-sm text-[#4B5563]">Team changes</div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {counts.teamChanges}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
              <div className="text-sm text-[#4B5563]">Filter</div>
              <div className="mt-2 text-sm font-medium text-[#111827] capitalize">
                {filter === "all"
                  ? "All requests"
                  : filter === "documents"
                  ? "Documents only"
                  : filter === "contractor_approvals"
                  ? "Contractor approvals only"
                  : filter === "company_changes"
                  ? "Company changes only"
                  : "Team changes only"}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              All ({counts.total})
            </FilterButton>

            <FilterButton
              active={filter === "documents"}
              onClick={() => setFilter("documents")}
            >
              Documents ({counts.documents})
            </FilterButton>

            <FilterButton
              active={filter === "contractor_approvals"}
              onClick={() => setFilter("contractor_approvals")}
            >
              Contractor approvals ({counts.contractorApprovals})
            </FilterButton>

            <FilterButton
              active={filter === "company_changes"}
              onClick={() => setFilter("company_changes")}
            >
              Company changes ({counts.companyChanges})
            </FilterButton>

            <FilterButton
              active={filter === "team_changes"}
              onClick={() => setFilter("team_changes")}
            >
              Team changes ({counts.teamChanges})
            </FilterButton>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">Loading review queue...</p>
          </section>
        ) : null}

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        {!loading && counts.total === 0 ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">No pending items.</p>
          </section>
        ) : null}

        {showContractorApprovals ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  Pending contractor approvals
                </h2>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Submitted contractor onboardings waiting for admin approval.
                </p>
              </div>

              <Link
                href="/admin/contractor-approvals"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                View all
              </Link>
            </div>

            {contractorApprovals.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                No pending contractor approvals.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {contractorApprovals.map((row) => {
                  const publicProfile = Array.isArray(row.public_profile)
                    ? row.public_profile[0] ?? null
                    : row.public_profile;

                  return (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-[#111827]">
                              {row.legal_name || "Unnamed company"}
                            </h3>
                            <MetaBadge
                              text={row.onboarding_status || "unknown"}
                              tone="warning"
                            />
                            <MetaBadge
                              text={row.status || "unknown"}
                              tone="info"
                            />
                            <MetaBadge
                              text={publicProfile?.is_listed ? "listed" : "not listed"}
                              tone={publicProfile?.is_listed ? "success" : "neutral"}
                            />
                          </div>

                          {row.dba_name ? (
                            <div className="mt-2 text-sm text-[#4B5563]">
                              DBA: {row.dba_name}
                            </div>
                          ) : null}

                          <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
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

                        <div className="lg:text-right">
                          <Link
                            href="/admin/contractor-approvals"
                            className="inline-flex rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {showDocuments ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  Pending documents
                </h2>
                <p className="mt-1 text-sm text-[#4B5563]">
                  COI and certifications waiting for review.
                </p>
              </div>
            </div>

            {docs.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                No pending documents.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {docs.map((d) => {
                  const isBusy = busyDocId === d.id;

                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-[#111827]">
                              {d.doc_kind.toUpperCase()}
                            </h3>
                            <StatusBadge status="pending" />
                          </div>

                          <div className="text-sm text-[#4B5563]">
                            Expires: {d.expires_at || "—"}
                          </div>

                          <a
                            className="inline-flex text-sm font-medium text-[#1F6FB5] hover:underline"
                            href={d.file_public_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open file
                          </a>
                        </div>

                        <div className="w-full max-w-md space-y-3">
                          <input
                            className="w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                            placeholder="Reject reason (optional)"
                            value={rejectNote[d.id] || ""}
                            onChange={(e) =>
                              setRejectNote((prev) => ({
                                ...prev,
                                [d.id]: e.target.value,
                              }))
                            }
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => onApprove(d.id)}
                            >
                              {isBusy ? "Processing..." : "Approve"}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => onReject(d.id)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {showCompanyChanges ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  Pending company change requests
                </h2>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Contractor requests to update company data.
                </p>
              </div>

              <Link
                href="/admin/company-change-requests"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                View all
              </Link>
            </div>

            {companyRequests.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                No pending company change requests.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {companyRequests.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                  >
                    <div className="grid gap-4 lg:grid-cols-[2fr_2fr_1fr_1.5fr_auto] lg:items-center">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Company
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.company?.legal_name || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          DBA
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.company?.dba_name || "—"}
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

                      <div className="lg:text-right">
                        <Link
                          href={`/admin/company-change-requests/${row.id}`}
                          className="inline-flex rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {showTeamChanges ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">
                  Pending team change requests
                </h2>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Contractor requests to change team composition.
                </p>
              </div>

              <Link
                href="/admin/team-change-requests"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                View all
              </Link>
            </div>

            {teamRequests.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                No pending team change requests.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {teamRequests.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.6fr_2fr_1fr_1.5fr_auto] lg:items-center">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Request ID
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.id}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Reason
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#111827]">
                          {row.reason}
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

                      <div className="lg:text-right">
                        <Link
                          href={`/admin/team-change-requests/${row.id}`}
                          className="inline-flex rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}