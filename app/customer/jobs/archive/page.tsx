"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../../lib/profile";
import { getMyCustomerOrg } from "../../../../lib/customers";
import { listCustomerJobsByStatus, updateJobStatus } from "../../../../lib/jobs";
import {
  listJobFilesForJobs,
  openJobFileSigned,
  JobFileRow,
} from "../../../../lib/jobFiles";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
  customer_id: string | null;
  deadline_date: string | null;
  visibility_mode: "public" | "qualified_only" | "approved_only";
};

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F4F8FC] px-3 py-1 text-xs font-medium text-[#4B5563]">
      {children}
    </span>
  );
}

function visibilityLabel(mode: JobRow["visibility_mode"]) {
  if (mode === "approved_only") return "Approved contractors only";
  if (mode === "qualified_only") return "Qualified contractors only";
  return "All contractors";
}

export default function CustomerJobsArchivePage() {
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

    const profile = await getMyProfile();
    if (!profile) return router.replace("/login");
    if (profile.role !== "customer") return router.replace("/dashboard");

    const org = await getMyCustomerOrg();
    if (!org) return router.replace("/customer/settings");

    try {
      const jobsArr = (await listCustomerJobsByStatus(
        org.id,
        "closed"
      )) as JobRow[];
      setJobs(jobsArr);

      const allFiles = await listJobFilesForJobs(jobsArr.map((x) => x.id));
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

  async function restoreJob(jobId: string) {
    setErr(null);

    try {
      if (!confirm("Restore this job back to Active?")) return;
      await updateJobStatus(jobId, "open");
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Restore error");
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold text-[#0A2E5C]">
            Archived Jobs
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Review closed jobs, download existing project files, and restore jobs
            back to active when needed.
          </p>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading archived jobs...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && jobs.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Archive is empty.</p>
        </section>
      ) : null}

      {!loading &&
        jobs.map((j) => {
          const files = filesByJob[j.id] || [];

          return (
            <section
              key={j.id}
              className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-[#111827]">
                      {j.title}
                    </h3>
                    <InfoPill>Status: {j.status}</InfoPill>
                    {j.deadline_date ? (
                      <InfoPill>Deadline: {j.deadline_date}</InfoPill>
                    ) : null}
                    <InfoPill>
                      Visibility: {visibilityLabel(j.visibility_mode)}
                    </InfoPill>
                  </div>

                  {j.location ? (
                    <p className="mt-3 text-sm text-[#4B5563]">{j.location}</p>
                  ) : null}

                  {j.description ? (
                    <p className="mt-3 text-sm leading-6 text-[#374151]">
                      {j.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    onClick={() => restoreJob(j.id)}
                  >
                    Restore
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#E5EDF5] bg-[#FBFDFF] p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-[#0A2E5C]">
                      Project Files
                    </h4>
                    <p className="mt-1 text-sm text-[#4B5563]">
                      Read-only for archived jobs. Existing files are still
                      available for download.
                    </p>
                  </div>
                </div>

                {files.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#D9E2EC] bg-white p-4 text-sm text-[#4B5563]">
                    No files.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex flex-col gap-3 rounded-xl border border-[#D9E2EC] bg-white p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#111827]">
                            {f.file_name}
                          </div>
                          <div className="mt-1 truncate text-xs text-[#6B7280]">
                            {f.file_path}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                            onClick={() => openJobFileSigned(f.file_path)}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-[#6B7280]">Job ID: {j.id}</div>
            </section>
          );
        })}
    </main>
  );
}