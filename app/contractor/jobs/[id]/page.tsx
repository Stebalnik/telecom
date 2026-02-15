"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import { listMyCompanies, listCompanyTeams } from "../../../../lib/contractor";
import { openJobFileSigned, listJobFiles, JobFileRow } from "../../../../lib/jobFiles";
import { businessDaysBetweenInclusive } from "../../../../lib/dateUtils";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  deadline_date: string | null;
  customer_id: string | null;
};

export default function ContractorJobBidPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [job, setJob] = useState<JobRow | null>(null);
  const [files, setFiles] = useState<JobFileRow[]>([]);

  // bid form
  const [companyId, setCompanyId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [workDays, setWorkDays] = useState<string>("");

  const [companies, setCompanies] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  const maxBusinessDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return businessDaysBetweenInclusive(startDate, endDate);
  }, [startDate, endDate]);

  async function load() {
    setLoading(true);
    setErr(null);

    const profile = await getMyProfile();
    if (!profile) return router.replace("/login");
    if (profile.role !== "contractor") return router.replace("/dashboard");

    try {
      const { data: j, error } = await supabase
        .from("jobs")
        .select("id,title,description,location,status,deadline_date,customer_id")
        .eq("id", jobId)
        .single();

      if (error) throw error;
      setJob(j as JobRow);

      // файлы (RLS сам отфильтрует)
      const f = await listJobFiles(jobId);
      setFiles(f);

      const comps = await listMyCompanies();
      setCompanies(comps);
      if (comps?.[0]?.id) {
        setCompanyId(comps[0].id);
        const ts = await listCompanyTeams(comps[0].id);
        setTeams(ts);
      }
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    (async () => {
      try {
        if (!companyId) return;
        const ts = await listCompanyTeams(companyId);
        setTeams(ts);
        setTeamId("");
      } catch {
        // ignore
      }
    })();
  }, [companyId]);

  function validateBid() {
    if (!job) throw new Error("Job not loaded");
    if (!companyId) throw new Error("Select company");
    if (!teamId) throw new Error("Select team");
    if (!price || Number(price) <= 0) throw new Error("Enter bid price");

    if (!startDate) throw new Error("Pick planned start date");
    if (!endDate) throw new Error("Pick planned end date");
    if (endDate < startDate) throw new Error("End date must be after start date");

    if (job.deadline_date && endDate > job.deadline_date) {
      throw new Error(`End date must be on/before job deadline (${job.deadline_date})`);
    }

    const wd = Number(workDays);
    if (!workDays || !Number.isFinite(wd) || wd < 1) throw new Error("Enter work days (>= 1)");

    const maxWd = businessDaysBetweenInclusive(startDate, endDate);
    if (maxWd <= 0) throw new Error("Time window contains 0 business days");
    if (wd > maxWd) throw new Error(`Work days (${wd}) must fit into business days in timeframe (${maxWd})`);
  }

  async function submitBid() {
    setErr(null);
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

      router.push("/contractor"); // или /contractor/jobs
    } catch (e: any) {
      setErr(e.message ?? "Bid error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job</h1>
        <a className="underline text-sm" href="/contractor/jobs">
          Back
        </a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {job && (
        <div className="rounded border p-4 space-y-2">
          <div className="text-lg font-semibold">{job.title}</div>
          <div className="text-sm text-gray-600">
            Deadline: <b>{job.deadline_date ?? "—"}</b>
            {job.location ? ` • ${job.location}` : ""}
          </div>
          {job.description && <div className="text-sm mt-2">{job.description}</div>}
        </div>
      )}

      {/* Files */}
      <div className="rounded border p-4 space-y-2">
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

      {/* Bid form */}
      <div className="rounded border p-4 space-y-4">
        <div className="text-lg font-semibold">Submit bid</div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Company</div>
            <select className="w-full rounded border p-2" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold">Team</div>
            <select className="w-full rounded border p-2" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Select...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name ?? t.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Bid price</div>
            <input className="w-full rounded border p-2" placeholder="e.g. 25000" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold">Work days</div>
            <input className="w-full rounded border p-2" placeholder="e.g. 5" value={workDays} onChange={(e) => setWorkDays(e.target.value)} />
            {startDate && endDate && (
              <div className="text-xs text-gray-600">
                Business days in selected timeframe: <b>{maxBusinessDays}</b>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Planned start date</div>
            <input className="w-full rounded border p-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold">Planned end date</div>
            <input className="w-full rounded border p-2" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <button className="rounded bg-black px-4 py-2 text-white" onClick={submitBid}>
          Submit bid
        </button>

        <div className="text-xs text-gray-600">
          Rules: end date must be on/before deadline; work days must fit into business days between start/end.
        </div>
      </div>
    </main>
  );
}
