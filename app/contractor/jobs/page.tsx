"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import { openJobFileSigned, listJobFilesForJobs, JobFileRow } from "../../../lib/jobFiles";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
  deadline_date: string | null;
  customer_id: string | null;
};

export default function ContractorJobsPage() {
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
    if (profile.role !== "contractor") return router.replace("/dashboard");

    try {
      // Open jobs visible всем (цены скрыты — у нас цены только в bids)
      const { data, error } = await supabase
        .from("jobs")
        .select("id,title,description,location,status,created_at,deadline_date,customer_id")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const arr = (data || []) as JobRow[];
      setJobs(arr);

      // файлы подтянем, но их RLS/Storage policies сами ограничат (увидит только кто can_bid)
      const allFiles = await listJobFilesForJobs(arr.map((x) => x.id));
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
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Available Jobs</h1>
        <a className="underline text-sm" href="/contractor">
          Back
        </a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {jobs.length === 0 && !loading && (
        <p className="text-sm text-gray-600">No open jobs yet.</p>
      )}

      <div className="space-y-4">
        {jobs.map((j) => {
          const files = filesByJob[j.id] || [];
          return (
            <div key={j.id} className="rounded border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{j.title}</div>
                  <div className="text-sm text-gray-600">
                    {j.location ? `${j.location} • ` : ""}
                    Deadline: <b>{j.deadline_date ?? "—"}</b>
                  </div>
                  {j.description && <div className="text-sm mt-2">{j.description}</div>}
                </div>

                <a className="rounded bg-black px-4 py-2 text-white" href={`/contractor/jobs/${j.id}`}>
                  View / Bid
                </a>
              </div>

              {/* Files (will show only if RLS allows select from job_files) */}
              <div className="rounded border p-3 space-y-2">
                <div className="font-semibold">Project files</div>
                {files.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    No files (or you are not eligible to view files for this job).
                  </div>
                ) : (
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
    </main>
  );
}
