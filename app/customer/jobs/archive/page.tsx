"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../../lib/profile";
import { getMyCustomerOrg } from "../../../../lib/customers";
import { listCustomerJobsByStatus, updateJobStatus } from "../../../../lib/jobs";
import { listJobFilesForJobs, openJobFileSigned, JobFileRow } from "../../../../lib/jobFiles";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
  customer_id: string | null;
  deadline_date: string | null;
};

export default function CustomerJobsArchivePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [filesByJob, setFilesByJob] = useState<Record<string, JobFileRow[]>>({});

  async function load() {
    setLoading(true);
    setErr(null);

    const profile = await getMyProfile();
    if (!profile) return router.replace("/login");
    if (profile.role !== "customer") return router.replace("/dashboard");

    const org = await getMyCustomerOrg();
    if (!org) return router.replace("/customer/settings");

    try {
      const jobsArr = (await listCustomerJobsByStatus(org.id, "closed")) as JobRow[];
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
    <div className="space-y-4">
      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Archived jobs</h2>

        {jobs.length === 0 && <p className="text-sm text-gray-600">Archive is empty.</p>}

        <div className="space-y-3">
          {jobs.map((j) => {
            const files = filesByJob[j.id] || [];
            return (
              <div key={j.id} className="rounded border p-3 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">{j.title}</div>
                    <div className="text-sm text-gray-600">
                      Status: <b>{j.status}</b>
                      {j.deadline_date ? (
                        <>
                          {" "}
                          • Deadline: <b>{j.deadline_date}</b>
                        </>
                      ) : null}
                    </div>
                    {j.location && <div className="text-sm text-gray-600">{j.location}</div>}
                    {j.description && <div className="text-sm mt-2">{j.description}</div>}
                  </div>

                  <button
                    className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => restoreJob(j.id)}
                  >
                    Restore
                  </button>
                </div>

                <div className="rounded border p-3 space-y-2">
                  <div className="font-semibold">Project files</div>
                  <div className="text-sm text-gray-600">
                    Read-only (archived). You can download existing files.
                  </div>

                  {files.length === 0 && <div className="text-sm text-gray-600">No files.</div>}

                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div key={f.id} className="flex items-center justify-between gap-3 rounded border p-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{f.file_name}</div>
                            <div className="text-xs text-gray-600 truncate">{f.file_path}</div>
                          </div>

                          <button
                            className="rounded border px-3 py-1 text-sm"
                            onClick={() => openJobFileSigned(f.file_path)}
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-600">Job ID: {j.id}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}