"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase/browser";
import { getMyProfile } from "../../../../lib/profile";
import { track } from "../../../../lib/track";
import { logError } from "../../../../lib/logError";
import {
  listCompanyTeams,
  listMyCompanies,
  listMyCustomerApprovalRows,
  approvalRowByCustomerId,
  requestCustomerApproval,
  type CustomerApprovalRow,
} from "../../../../lib/contractor";
import {
  listJobFiles,
  openJobFileSigned,
  JobFileRow,
} from "../../../../lib/jobFiles";
import { businessDaysBetweenInclusive } from "../../../../lib/dateUtils";

type JobVisibilityMode = "public" | "qualified_only" | "approved_only";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  deadline_date: string | null;
  customer_id: string | null;
  visibility_mode: JobVisibilityMode;
  customers:
    | {
        id: string;
        name: string | null;
        description: string | null;
      }
    | {
        id: string;
        name: string | null;
        description: string | null;
      }[]
    | null;
};

type CompanyOption = {
  id: string;
  legal_name?: string | null;
  dba_name?: string | null;
  name?: string | null;
};

type TeamOption = {
  id: string;
  name?: string | null;
};

function normalizeCustomer(
  value: JobRow["customers"]
): { id: string; name: string | null; description: string | null } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function visibilityLabel(mode: JobVisibilityMode) {
  if (mode === "approved_only") return "Approved contractors only";
  if (mode === "qualified_only") return "Qualified contractors only";
  return "All contractors";
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "").toLowerCase();

  const cls =
    normalized === "open"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : normalized === "closed" || normalized === "cancelled"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${cls}`}
    >
      {status || "Unknown"}
    </span>
  );
}

function ApprovalBadge({
  row,
}: {
  row?: CustomerApprovalRow | null;
}) {
  if (!row) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
        Approval required
      </span>
    );
  }

  if (row.status === "approved") {
    return (
      <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        Approved by customer
      </span>
    );
  }

  if (row.status === "rejected") {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Pending customer approval
    </span>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F4F8FC] px-3 py-1 text-xs font-medium text-[#4B5563]">
      {children}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-[#4B5563]">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function ContractorJobBidPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [job, setJob] = useState<JobRow | null>(null);
  const [files, setFiles] = useState<JobFileRow[]>([]);

  const [companyId, setCompanyId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [workDays, setWorkDays] = useState<string>("");

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [approvalMap, setApprovalMap] = useState<Record<string, CustomerApprovalRow>>({});

  const maxBusinessDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return businessDaysBetweenInclusive(startDate, endDate);
  }, [startDate, endDate]);

  const customer = normalizeCustomer(job?.customers || null);
  const approval = job?.customer_id ? approvalMap[job.customer_id] : null;
  const isApproved = approval?.status === "approved";
  const isPending = approval?.status === "pending";
  const cooldownActive =
    !!approval?.cooldown_until &&
    new Date(approval.cooldown_until).getTime() > Date.now() &&
    approval?.status !== "approved";

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();

      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const [jobResult, comps, approvals] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            `
            id,
            title,
            description,
            location,
            status,
            deadline_date,
            customer_id,
            visibility_mode,
            customers (
              id,
              name,
              description
            )
          `
          )
          .eq("id", jobId)
          .single(),
        listMyCompanies(),
        listMyCustomerApprovalRows(),
      ]);

      if (jobResult.error) throw jobResult.error;

      const loadedJob = jobResult.data as JobRow;
      setJob(loadedJob);
      setApprovalMap(approvalRowByCustomerId(approvals));

      const f = await listJobFiles(jobId);
      setFiles(f);

      setCompanies(comps as CompanyOption[]);

      if (comps?.[0]?.id) {
        setCompanyId(comps[0].id);
        const ts = (await listCompanyTeams(comps[0].id)) as TeamOption[];
        setTeams(ts);
      }

      await track("job_opened", {
        role: "contractor",
        meta: {
          jobId,
          customerId: loadedJob.customer_id,
          visibilityMode: loadedJob.visibility_mode,
          status: loadedJob.status,
        },
      });
    } catch (e: any) {
      setErr("Something went wrong. Please try again.");

      await logError("contractor_job_page_load_failed", {
        source: "frontend",
        area: "contractor_job_page",
        role: "contractor",
        details: {
          jobId,
          errorMessage: e?.message ?? "Unknown error",
        },
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    (async () => {
      try {
        if (!companyId) return;
        const ts = (await listCompanyTeams(companyId)) as TeamOption[];
        setTeams(ts);
        setTeamId("");
      } catch (e: any) {
        await logError("contractor_job_teams_load_failed", {
          source: "frontend",
          area: "contractor_job_page",
          role: "contractor",
          details: {
            jobId,
            companyId,
            errorMessage: e?.message ?? "Unknown error",
          },
        });
      }
    })();
  }, [companyId, jobId]);

  function validateBid() {
    if (!job) throw new Error("Job not loaded");
    if (!isApproved) throw new Error("Customer approval is required before bidding.");
    if (!companyId) throw new Error("Select company");
    if (!teamId) throw new Error("Select team");
    if (!price || Number(price) <= 0) throw new Error("Enter bid price");

    if (!startDate) throw new Error("Pick planned start date");
    if (!endDate) throw new Error("Pick planned end date");
    if (endDate < startDate) throw new Error("End date must be after start date");

    if (job.deadline_date && endDate > job.deadline_date) {
      throw new Error(
        `End date must be on or before the job deadline (${job.deadline_date})`
      );
    }

    const wd = Number(workDays);
    if (!workDays || !Number.isFinite(wd) || wd < 1) {
      throw new Error("Enter work days (>= 1)");
    }

    const maxWd = businessDaysBetweenInclusive(startDate, endDate);
    if (maxWd <= 0) throw new Error("Time window contains 0 business days");
    if (wd > maxWd) {
      throw new Error(
        `Work days (${wd}) must fit into business days in the selected timeframe (${maxWd})`
      );
    }
  }

  async function handleRequestApproval() {
    if (!job?.customer_id) {
      setErr("Customer not found for this job.");
      return;
    }

    if (!companyId) {
      setErr("Select company first.");
      return;
    }

    setErr(null);
    setRequestingApproval(true);

    try {
      const result = await requestCustomerApproval(job.customer_id, companyId);

      if (!result.ok) {
        if (result.cooldown_until) {
          setErr(
            `You can request approval from this customer again on ${formatDateTime(
              result.cooldown_until
            )}.`
          );
        } else {
          setErr(result.message || "Approval request failed.");
        }

        await logError("customer_approval_request_failed", {
          source: "frontend",
          area: "contractor_job_page",
          role: "contractor",
          details: {
            jobId,
            customerId: job.customer_id,
            companyId,
            resultMessage: result.message ?? null,
            cooldownUntil: result.cooldown_until ?? null,
          },
        });

        return;
      }

      await track("customer_approval_requested", {
        role: "contractor",
        meta: {
          jobId,
          customerId: job.customer_id,
          companyId,
        },
      });

      await load();
    } catch (e: any) {
      setErr("Approval request failed.");

      await logError("customer_approval_request_exception", {
        source: "frontend",
        area: "contractor_job_page",
        role: "contractor",
        details: {
          jobId,
          customerId: job.customer_id,
          companyId,
          errorMessage: e?.message ?? "Unknown error",
        },
      });
    } finally {
      setRequestingApproval(false);
    }
  }

  async function submitBid() {
    setErr(null);
    setSubmitting(true);

    try {
      validateBid();

      const { error } = await supabase.from("bids").insert({
        job_id: jobId,
        company_id: companyId,
        team_id: teamId,
        price: Number(price),
        planned_start_date: startDate,
        planned_end_date: endDate,
        work_days: Number(workDays),
        status: "submitted",
      });

      if (error) throw error;

      await track("submit_bid", {
        role: "contractor",
        meta: {
          jobId,
          companyId,
          teamId,
          customerId: job?.customer_id ?? null,
          price: Number(price),
          plannedStartDate: startDate,
          plannedEndDate: endDate,
          workDays: Number(workDays),
        },
      });

      router.push("/contractor/jobs");
    } catch (e: any) {
      const safeMessage =
        e?.message === "Job not loaded" ||
        e?.message === "Customer approval is required before bidding." ||
        e?.message === "Select company" ||
        e?.message === "Select team" ||
        e?.message === "Enter bid price" ||
        e?.message === "Pick planned start date" ||
        e?.message === "Pick planned end date" ||
        e?.message === "End date must be after start date" ||
        String(e?.message || "").includes("job deadline") ||
        String(e?.message || "").includes("Work days") ||
        String(e?.message || "").includes("business days")
          ? e.message
          : "Bid error";

      setErr(safeMessage);

      await logError("submit_bid_failed", {
        source: "frontend",
        area: "contractor_job_page",
        role: "contractor",
        details: {
          jobId,
          companyId,
          teamId,
          customerId: job?.customer_id ?? null,
          price,
          startDate,
          endDate,
          workDays,
          errorMessage: e?.message ?? "Unknown error",
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Job</h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Review job details, see the customer, request approval if needed,
              and submit your bid only after approval.
            </p>
          </div>

          <Link
            href="/contractor/jobs"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Back to jobs
          </Link>
        </div>
      </section>

      {loading ? (
        <SectionCard title="Loading">
          <p className="text-sm text-[#4B5563]">Loading job details...</p>
        </SectionCard>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {job ? (
        <SectionCard title="Job details">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-[#111827]">
                  {job.title}
                </h2>
                <StatusBadge status={job.status} />
                <ApprovalBadge row={approval} />
                <InfoPill>
                  Visibility: {visibilityLabel(job.visibility_mode)}
                </InfoPill>
              </div>

              <div className="mt-2 text-sm text-[#4B5563]">
                Customer:{" "}
                <span className="font-medium text-[#111827]">
                  {customer?.name || "Unknown customer"}
                </span>
              </div>

              <div className="mt-1 text-sm text-[#4B5563]">
                Deadline:{" "}
                <span className="font-medium text-[#111827]">
                  {formatDate(job.deadline_date)}
                </span>
                {job.location ? ` • ${job.location}` : ""}
              </div>

              {cooldownActive ? (
                <div className="mt-2 text-xs text-[#B45309]">
                  Next approval request available on{" "}
                  {formatDateTime(approval?.cooldown_until)}
                </div>
              ) : null}

              {job.description ? (
                <p className="mt-3 text-sm leading-6 text-[#111827]">
                  {job.description}
                </p>
              ) : null}

              <div className="mt-3 text-xs text-[#6B7280] break-all">
                Job ID: {job.id}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRequestApproval}
                disabled={
                  !job.customer_id ||
                  isApproved ||
                  isPending ||
                  cooldownActive ||
                  requestingApproval
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  !job.customer_id ||
                  isApproved ||
                  isPending ||
                  cooldownActive ||
                  requestingApproval
                    ? "cursor-not-allowed border border-[#D9E2EC] bg-[#F8FAFC] text-[#9CA3AF]"
                    : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                }`}
              >
                {isApproved
                  ? "Approved"
                  : isPending
                  ? "Request sent"
                  : requestingApproval
                  ? "Sending..."
                  : "Request approval"}
              </button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Project files"
        subtitle="These files are visible only when your access level allows it."
      >
        {files.length === 0 ? (
          <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
            No files available for this job.
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex flex-col gap-3 rounded-xl border border-[#D9E2EC] bg-[#FCFDFE] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#111827]">
                    {f.file_name}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#6B7280]">
                    {f.file_path}
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                  onClick={() => openJobFileSigned(f.file_path)}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Submit bid"
        subtitle="Bidding is enabled only after this customer approves your company."
      >
        {!isApproved ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {isPending
              ? "Your approval request has been sent. You can submit a bid after the customer approves your company."
              : cooldownActive
              ? `Approval request cooldown is active until ${formatDateTime(
                  approval?.cooldown_until
                )}.`
              : "Customer approval is required before you can submit a bid for this job."}
          </div>
        ) : null}

        <div className={`grid gap-4 md:grid-cols-2 ${!isApproved ? "opacity-60" : ""}`}>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Company
            </label>
            <select
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={!isApproved}
            >
              <option value="">Select...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legal_name || c.dba_name || c.name || c.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Team
            </label>
            <select
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={!isApproved}
            >
              <option value="">Select...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Bid price
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              placeholder="e.g. 25000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!isApproved}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Work days
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              placeholder="e.g. 5"
              value={workDays}
              onChange={(e) => setWorkDays(e.target.value)}
              disabled={!isApproved}
            />
            {startDate && endDate ? (
              <div className="mt-2 text-xs text-[#6B7280]">
                Business days in selected timeframe:{" "}
                <span className="font-semibold text-[#111827]">
                  {maxBusinessDays}
                </span>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Planned start date
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!isApproved}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Planned end date
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!isApproved}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={submitBid}
            disabled={submitting || !isApproved}
          >
            {submitting ? "Submitting..." : "Submit bid"}
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-xs text-[#4B5563]">
          Rules: the planned end date must be on or before the deadline, and
          work days must fit into business days between the selected start and
          end dates.
        </div>
      </SectionCard>
    </main>
  );
}