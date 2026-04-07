"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../../lib/profile";
import { getMyCustomerOrg } from "../../../../lib/customers";
import { listCustomerJobsByStatus, updateJobStatus } from "../../../../lib/jobs";
import {
  listJobFilesForJobs,
  uploadJobFile,
  openJobFileSigned,
  deleteJobFile,
  JobFileRow,
} from "../../../../lib/jobFiles";
import { withErrorLogging } from "../../../../lib/errors/withErrorLogging";

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

export default function CustomerJobsActivePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [filesByJob, setFilesByJob] = useState<Record<string, JobFileRow[]>>(
    {}
  );

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      await withErrorLogging(
        async () => {
          const profile = await getMyProfile();

          if (!profile) {
            router.replace("/login");
            return;
          }

          if (profile.role !== "customer") {
            router.replace("/dashboard");
            return;
          }

          const org = await getMyCustomerOrg();

          if (!org) {
            router.replace("/customer/settings");
            return;
          }

          setCustomerId(org.id);

          const jobsArr = (await listCustomerJobsByStatus(
            org.id,
            "open"
          )) as JobRow[];
          setJobs(jobsArr);

          const allFiles = await listJobFilesForJobs(jobsArr.map((x) => x.id));
          const map: Record<string, JobFileRow[]> = {};

          for (const f of allFiles) {
            if (!map[f.job_id]) map[f.job_id] = [];
            map[f.job_id].push(f);
          }

          setFilesByJob(map);
        },
        {
          message: "customer_active_jobs_load_failed",
          code: "customer_active_jobs_load_failed",
          source: "frontend",
          area: "jobs",
          path: "/customer/jobs/active",
          role: "customer",
        }
      );
    } catch {
      setErr("Unable to load active jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(jobId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);

    try {
      await withErrorLogging(
        async () => {
          for (const f of Array.from(files)) {
            await uploadJobFile(jobId, f);
          }

          await load();
        },
        {
          message: "customer_job_file_upload_failed",
          code: "customer_job_file_upload_failed",
          source: "frontend",
          area: "jobs",
          path: "/customer/jobs/active",
          role: "customer",
          details: {
            jobId,
            fileCount: files.length,
            fileNames: Array.from(files).map((file) => file.name),
          },
        }
      );
    } catch {
      setErr("Unable to upload files. Please try again.");
    }
  }

  async function onDeleteFile(f: JobFileRow) {
    setErr(null);

    try {
      if (!confirm(`Delete file "${f.file_name}"?`)) return;

      await withErrorLogging(
        async () => {
          await deleteJobFile(f);
          await load();
        },
        {
          message: "customer_job_file_delete_failed",
          code: "customer_job_file_delete_failed",
          source: "frontend",
          area: "jobs",
          path: "/customer/jobs/active",
          role: "customer",
          details: {
            jobId: f.job_id,
            fileId: f.id,
            fileName: f.file_name,
            filePath: f.file_path,
          },
        }
      );
    } catch {
      setErr("Unable to delete the file. Please try again.");
    }
  }

  async function archiveJob(jobId: string) {
    setErr(null);

    try {
      if (!confirm("Move this job to Archive?")) return;

      await withErrorLogging(
        async () => {
          await updateJobStatus(jobId, "closed");
          await load();
        },
        {
          message: "customer_job_archive_failed",
          code: "customer_job_archive_failed",
          source: "frontend",
          area: "jobs",
          path: "/customer/jobs/active",
          role: "customer",
          details: {
            jobId,
            nextStatus: "closed",
          },
        }
      );
    } catch {
      setErr("Unable to archive the job. Please try again.");
    }
  }

  async function onDownloadFile(filePath: string, jobId: string, fileId: string) {
    setErr(null);

    try {
      await withErrorLogging(
        async () => {
          await openJobFileSigned(filePath);
        },
        {
          message: "customer_job_file_open_failed",
          code: "customer_job_file_open_failed",
          source: "frontend",
          area: "jobs",
          path: "/customer/jobs/active",
          role: "customer",
          details: {
            jobId,
            fileId,
            filePath,
          },
        }
      );
    } catch {
      setErr("Unable to open the file. Please try again.");
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#0A2E5C]">
              Active Jobs
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Manage open jobs, upload project files, and move completed work to
              archive.
            </p>
          </div>

          {customerId ? (
            <div className="text-xs text-[#4B5563]">
              Customer Org ID:{" "}
              <span className="font-medium text-[#111827]">{customerId}</span>
            </div>
          ) : null}
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading active jobs...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && jobs.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">No active jobs yet.</p>
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
                    onClick={() => void archiveJob(j.id)}
                  >
                    Archive
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
                      Only eligible contractors and approved vendors can view or
                      download these files.
                    </p>
                  </div>

                  <div className="text-xs text-[#4B5563]">
                    Path: jobs/{j.id}/...
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]">
                    Upload files
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(e) => void onUpload(j.id, e.target.files)}
                    />
                  </label>
                </div>

                {files.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#D9E2EC] bg-white p-4 text-sm text-[#4B5563]">
                    No files uploaded yet.
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
                            onClick={() =>
                              void onDownloadFile(f.file_path, f.job_id, f.id)
                            }
                          >
                            Download
                          </button>

                          <button
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                            onClick={() => void onDeleteFile(f)}
                          >
                            Delete
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