"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { getMyCompany } from "../../../lib/contractor";
import { listOpenJobs, Job } from "../../../lib/jobs";
import { eligibleTeamsForJob, submitBid } from "../../../lib/bids";

export default function ContractorJobsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyStatus, setCompanyStatus] = useState<"active" | "blocked" | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [bidPrice, setBidPrice] = useState<Record<string, string>>({});
  const [bidMsg, setBidMsg] = useState<Record<string, string>>({});
  const [teamOptions, setTeamOptions] = useState<Record<string, { team_id: string; team_name: string }[]>>({});
  const [selectedTeam, setSelectedTeam] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setErr(null);

    const profile = await getMyProfile();
    if (!profile) return router.replace("/login");
    if (profile.role !== "contractor") return router.replace("/dashboard");

    try {
      const c = await getMyCompany();
      if (!c) throw new Error("Create company first in /contractor");
      setCompanyId(c.id);
      setCompanyStatus(c.status);
      setBlockReason(c.block_reason);

      const j = await listOpenJobs();
      setJobs(j);

      // preload eligible teams per job
      const map: Record<string, { team_id: string; team_name: string }[]> = {};
      for (const job of j) {
        map[job.id] = await eligibleTeamsForJob(c.id, job.id);
      }
      setTeamOptions(map);
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

  async function onSubmit(jobId: string) {
    setErr(null);
    try {
      if (!companyId) return;
      if (companyStatus !== "active") return setErr("Company is blocked. Fix insurance first.");

      const priceNum = Number(bidPrice[jobId]);
      if (!priceNum || priceNum <= 0) return setErr("Enter bid price.");

      const teamId = selectedTeam[jobId] || null;

      await submitBid({
        jobId,
        companyId,
        teamId,
        price: priceNum,
        message: bidMsg[jobId] || "",
      });

      setBidPrice((p) => ({ ...p, [jobId]: "" }));
      setBidMsg((p) => ({ ...p, [jobId]: "" }));
      alert("Bid submitted!");
    } catch (e: any) {
      setErr(e.message ?? "Submit error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contractor: Open jobs</h1>
        <a className="underline" href="/contractor">Back</a>
      </div>

      {companyStatus === "blocked" && (
        <div className="rounded border p-4">
          <b className="text-red-700">Company blocked</b>
          <div className="text-sm text-gray-700">{blockReason}</div>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {jobs.length === 0 && !loading && <p className="text-sm text-gray-600">No open jobs.</p>}

      <div className="grid gap-3">
        {jobs.map((j) => (
          <div key={j.id} className="rounded border p-4">
            <b>{j.title}</b>
            {j.location && <div className="text-sm text-gray-600">{j.location}</div>}
            {j.description && <div className="mt-2 text-sm">{j.description}</div>}

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <input
                className="rounded border p-2"
                placeholder="Bid price"
                value={bidPrice[j.id] || ""}
                onChange={(e) => setBidPrice((p) => ({ ...p, [j.id]: e.target.value }))}
              />
              <select
                className="rounded border p-2"
                value={selectedTeam[j.id] || ""}
                onChange={(e) => setSelectedTeam((p) => ({ ...p, [j.id]: e.target.value }))}
              >
                <option value="">Select team (optional)</option>
                {(teamOptions[j.id] || []).map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              className="mt-2 w-full rounded border p-2"
              placeholder="Message"
              value={bidMsg[j.id] || ""}
              onChange={(e) => setBidMsg((p) => ({ ...p, [j.id]: e.target.value }))}
            />

            <button
              className="mt-3 rounded bg-black px-4 py-2 text-white disabled:opacity-40"
              disabled={companyStatus !== "active"}
              onClick={() => onSubmit(j.id)}
            >
              Submit bid
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
