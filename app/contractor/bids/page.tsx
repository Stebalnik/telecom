"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";

type ContractorCompanyRow = {
  id: string;
  legal_name: string;
  dba_name: string | null;
};

type BidRowDb = {
  id: string;
  job_id: string;
  company_id: string;
  team_id: string | null;
  price: number;
  message: string | null;
  review_notes: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  work_days: number | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  jobs:
    | {
        title: string | null;
        location: string | null;
        deadline_date: string | null;
        customer_id: string | null;
      }
    | {
        title: string | null;
        location: string | null;
        deadline_date: string | null;
        customer_id: string | null;
      }[]
    | null;
  teams:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type CustomerRow = {
  id: string;
  name: string;
};

type BidRow = {
  id: string;
  job_id: string;
  price: number;
  message: string | null;
  review_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  work_days: number | null;
  reviewed_at: string | null;

  job_title: string | null;
  job_location: string | null;
  job_deadline_date: string | null;
  customer_id: string | null;
  customer_name: string | null;
  team_name: string | null;
};

function formatMoney(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "submitted").toLowerCase();

  const cls =
    normalized === "accepted"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalized === "rejected"
      ? "border-red-200 bg-red-50 text-red-700"
      : normalized === "revision_requested"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${cls}`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">{value}</div>
      <div className="mt-1 text-sm text-[#4B5563]">{hint}</div>
    </div>
  );
}

function normalizeJoinObject<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function ContractorBidsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [company, setCompany] = useState<ContractorCompanyRow | null>(null);
  const [rows, setRows] = useState<BidRow[]>([]);

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

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const userId = sessionData.session?.user?.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      const { data: companyRow, error: companyErr } = await supabase
        .from("contractor_companies")
        .select("id,legal_name,dba_name")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (companyErr) throw companyErr;
      if (!companyRow) {
        setErr("Contractor company not found. Complete company onboarding first.");
        setLoading(false);
        return;
      }

      setCompany(companyRow as ContractorCompanyRow);

      const { data: bidRows, error: bidsErr } = await supabase
        .from("bids")
        .select(`
          id,
          job_id,
          company_id,
          team_id,
          price,
          message,
          review_notes,
          status,
          created_at,
          updated_at,
          planned_start_date,
          planned_end_date,
          work_days,
          reviewed_at,
          reviewed_by,
          jobs!inner (
            title,
            location,
            deadline_date,
            customer_id
          ),
          teams (
            name
          )
        `)
        .eq("company_id", companyRow.id)
        .order("created_at", { ascending: false });

      if (bidsErr) throw bidsErr;

      const raw = (bidRows || []) as BidRowDb[];

      const customerIds = Array.from(
        new Set(
          raw
            .map((row) => normalizeJoinObject(row.jobs)?.customer_id || null)
            .filter(Boolean)
        )
      ) as string[];

      let customerNameById: Record<string, string> = {};
      if (customerIds.length > 0) {
        const { data: customerRows, error: customersErr } = await supabase
          .from("customers")
          .select("id,name")
          .in("id", customerIds);

        if (customersErr) throw customersErr;

        customerNameById = Object.fromEntries(
          ((customerRows || []) as CustomerRow[]).map((c) => [c.id, c.name])
        );
      }

      const normalized: BidRow[] = raw.map((row) => {
        const job = normalizeJoinObject(row.jobs);
        const team = normalizeJoinObject(row.teams);

        return {
          id: row.id,
          job_id: row.job_id,
          price: row.price,
          message: row.message,
          review_notes: row.review_notes,
          status: row.status || "submitted",
          created_at: row.created_at,
          updated_at: row.updated_at,
          planned_start_date: row.planned_start_date,
          planned_end_date: row.planned_end_date,
          work_days: row.work_days,
          reviewed_at: row.reviewed_at,
          job_title: job?.title || null,
          job_location: job?.location || null,
          job_deadline_date: job?.deadline_date || null,
          customer_id: job?.customer_id || null,
          customer_name: job?.customer_id ? customerNameById[job.customer_id] || null : null,
          team_name: team?.name || null,
        };
      });

      setRows(normalized);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const submitted = rows.filter((r) => r.status === "submitted").length;
    const accepted = rows.filter((r) => r.status === "accepted").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;

    return {
      total: rows.length,
      submitted,
      accepted,
      rejected,
    };
  }, [rows]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Bids</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#4B5563]">
              Review all bids submitted by your company, including job site,
              customer, current bid status, proposed schedule, and customer deadline.
            </p>
            {company ? (
              <div className="mt-2 text-xs text-[#6B7280]">
                Company: {company.dba_name || company.legal_name}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/contractor/jobs"
              className="rounded-xl bg-[#1F6FB5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Browse Jobs
            </Link>
            <Link
              href="/contractor"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading bids...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && !err ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Bids"
            value={stats.total}
            hint="All bids submitted by your company"
          />
          <StatCard
            label="Submitted"
            value={stats.submitted}
            hint="Awaiting customer review"
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            hint="Awarded or accepted by customer"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            hint="Not selected by customer"
          />
        </section>
      ) : null}

      {!loading && !err && rows.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2E5C]">No bids yet</h2>
          <p className="mt-2 text-sm text-[#4B5563]">
            You have not submitted any bids yet. Open available jobs and submit your first offer.
          </p>
          <div className="mt-4">
            <Link
              href="/contractor/jobs"
              className="inline-flex rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Open Jobs
            </Link>
          </div>
        </section>
      ) : null}

      {!loading && !err && rows.length > 0 ? (
        <section className="grid gap-4">
          {rows.map((row) => (
            <section
              key={row.id}
              className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {row.job_title || "Untitled Job"}
                    </h2>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Customer
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {row.customer_name || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Site
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {row.job_location || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Team
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {row.team_name || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Customer Deadline
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {formatDate(row.job_deadline_date)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Your Bid
                      </div>
                      <div className="mt-1 text-base font-semibold text-[#0A2E5C]">
                        {formatMoney(row.price)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Planned Start
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {formatDate(row.planned_start_date)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Planned End
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {formatDate(row.planned_end_date)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Work Days
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {row.work_days ?? "—"}
                      </div>
                    </div>
                  </div>

                  {row.message ? (
                    <div className="mt-4 rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                        Bid Message
                      </div>
                      <div className="mt-1 text-sm text-[#111827]">{row.message}</div>
                    </div>
                  ) : null}

                  {row.review_notes ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Customer Review Notes
                      </div>
                      <div className="mt-1 text-sm text-amber-900">{row.review_notes}</div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#6B7280]">
                    <span>Submitted: {formatDate(row.created_at)}</span>
                    <span>Reviewed: {formatDate(row.reviewed_at)}</span>
                    <span>Bid ID: {row.id}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:w-[180px] lg:flex-col">
                  <Link
                    href={`/contractor/jobs/${row.job_id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-[#1F6FB5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                  >
                    Open Job
                  </Link>

                  <Link
                    href="/contractor/jobs"
                    className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                  >
                    All Jobs
                  </Link>
                </div>
              </div>
            </section>
          ))}
        </section>
      ) : null}
    </main>
  );
}