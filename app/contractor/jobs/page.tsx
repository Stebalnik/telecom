"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import {
  listJobFilesForJobs,
  openJobFileSigned,
  JobFileRow,
} from "../../../lib/jobFiles";

type JobVisibilityMode = "public" | "qualified_only" | "approved_only";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
  deadline_date: string | null;
  customer_id: string | null;
  visibility_mode: JobVisibilityMode;
};

async function getApprovedCustomerIdsForMyCompany(): Promise<Set<string>> {
  const { data: authData, error: authErr } = await supabase.auth.getSession();
  if (authErr) throw authErr;
  if (!authData.session?.user) throw new Error("Not logged in");

  const { data: company, error: companyErr } = await supabase
    .from("contractor_companies")
    .select("id")
    .eq("owner_user_id", authData.session.user.id)
    .maybeSingle();

  if (companyErr) throw companyErr;
  if (!company?.id) return new Set();

  const { data, error } = await supabase
    .from("customer_contractors")
    .select("customer_id,status")
    .eq("contractor_company_id", company.id)
    .eq("status", "approved");

  if (error) throw error;

  return new Set(
    (data || [])
      .map((x: { customer_id: string | null }) => x.customer_id)
      .filter((x): x is string => Boolean(x))
  );
}

function canSeeJob(job: JobRow, approvedCustomerIds: Set<string>): boolean {
  if (job.visibility_mode === "public") return true;
  if (!job.customer_id) return false;

  if (job.visibility_mode === "approved_only") {
    return approvedCustomerIds.has(job.customer_id);
  }

  if (job.visibility_mode === "qualified_only") {
    // MVP behavior for now:
    // qualified_only behaves the same as approved_only
    return approvedCustomerIds.has(job.customer_id);
  }

  return false;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
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

export default function ContractorJobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [filesByJob, setFilesByJob] = useState<Record<string, JobFileRow[]>>(
    {}
  );

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

      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id,title,description,location,status,created_at,deadline_date,customer_id,visibility_mode"
        )
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const arr = (data || []) as JobRow[];
      const approvedCustomerIds = await getApprovedCustomerIdsForMyCompany();
      const visibleJobs = arr.filter((job) => canSeeJob(job, approvedCustomerIds));

      setJobs(visibleJobs);

      const allFiles = await listJobFilesForJobs(visibleJobs.map((x) => x.id));
      const map: Record<string, JobFileRow[]> = {};

      for (const f of allFiles) {
        if (!map[f.job_id]) map[f.job_id] = [];
        map[f.job_id].push(f);
      }

      setFilesByJob(map);
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

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Available Jobs
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Browse open jobs, review project files, and open a job to submit a
              bid.
            </p>
          </div>

          <Link
            href="/contractor"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Back to overview
          </Link>
        </div>
      </section>

      {loading ? (
        <SectionCard title="Loading">
          <p className="text-sm text-[#4B5563]">Loading available jobs...</p>
        </SectionCard>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && jobs.length === 0 ? (
        <SectionCard title="Jobs">
          <p className="text-sm text-[#4B5563]">
            No open jobs available for your company.
          </p>
        </SectionCard>
      ) : null}

      {!loading && jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map((j) => {
            const files = filesByJob[j.id] || [];

            return (
              <section
                key={j.id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-[#111827]">
                        {j.title}
                      </h2>
                      <StatusBadge status={j.status} />
                      <InfoPill>
                        Visibility: {visibilityLabel(j.visibility_mode)}
                      </InfoPill>
                    </div>

                    <div className="mt-2 text-sm text-[#4B5563]">
                      {j.location ? `${j.location} • ` : ""}
                      Deadline:{" "}
                      <span className="font-medium text-[#111827]">
                        {formatDate(j.deadline_date)}
                      </span>
                    </div>

                    {j.description ? (
                      <p className="mt-3 max-w-4xl text-sm leading-6 text-[#111827]">
                        {j.description}
                      </p>
                    ) : null}

                    <div className="mt-3 text-xs text-[#6B7280] break-all">
                      Job ID: {j.id}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/contractor/jobs/${j.id}`}
                      className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                    >
                      View / Bid
                    </Link>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                  <div className="text-sm font-semibold text-[#111827]">
                    Project files
                  </div>

                  {files.length === 0 ? (
                    <div className="mt-2 text-sm text-[#4B5563]">
                      No files available, or you are not eligible to view files
                      for this job.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {files.map((f) => (
                        <div
                          key={f.id}
                          className="flex flex-col gap-3 rounded-xl border border-[#D9E2EC] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
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
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}