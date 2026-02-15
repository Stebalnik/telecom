"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { listCertTypes, CertType } from "../../../lib/documents";
import { createJob, getJobRequiredCerts, listMyJobs, setJobRequiredCerts, Job } from "../../../lib/jobs";

export default function CustomerJobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const [selectedReqCerts, setSelectedReqCerts] = useState<Record<string, string[]>>({});

  async function load() {
    setLoading(true);
    setErr(null);
    const profile = await getMyProfile();
    if (!profile) return router.replace("/login");
    if (profile.role !== "customer") return router.replace("/dashboard");

    try {
      const [j, ct] = await Promise.all([listMyJobs(), listCertTypes()]);
      setJobs(j);
      setCertTypes(ct);

      const map: Record<string, string[]> = {};
      for (const job of j) {
        map[job.id] = await getJobRequiredCerts(job.id);
      }
      setSelectedReqCerts(map);
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

  async function onCreateJob() {
    setErr(null);
    try {
      if (!title.trim()) return setErr("Title is required.");
      const job = await createJob({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
      });
      setTitle(""); setDescription(""); setLocation(""); setBudgetMin(""); setBudgetMax("");
      await load();
      // auto open required cert editor on the created job (optional)
    } catch (e: any) {
      setErr(e.message ?? "Create job error");
    }
  }

  async function toggleReq(jobId: string, certId: string) {
    const current = selectedReqCerts[jobId] || [];
    const next = current.includes(certId) ? current.filter((x) => x !== certId) : [...current, certId];
    setSelectedReqCerts((p) => ({ ...p, [jobId]: next }));

    try {
      await setJobRequiredCerts(jobId, next);
    } catch (e: any) {
      setErr(e.message ?? "Save requirements error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customer: Jobs</h1>
        <a className="underline" href="/customer">Back</a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="rounded border p-4 space-y-3">
        <h2 className="font-semibold">Create new job</h2>
        <input className="w-full rounded border p-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full rounded border p-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="w-full rounded border p-2" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <div className="grid gap-2 md:grid-cols-2">
          <input className="w-full rounded border p-2" placeholder="Budget min" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
          <input className="w-full rounded border p-2" placeholder="Budget max" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
        </div>
        <button className="rounded bg-black px-4 py-2 text-white" onClick={onCreateJob}>
          Create job
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">My jobs</h2>
        {jobs.length === 0 && !loading && <p className="text-sm text-gray-600">No jobs yet.</p>}

        {jobs.map((j) => (
          <div key={j.id} className="rounded border p-4">
            <div className="flex items-center justify-between">
              <b>{j.title}</b>
              <span className="text-sm">{j.status}</span>
            </div>
            {j.location && <div className="text-sm text-gray-600">{j.location}</div>}
            {j.description && <div className="mt-2 text-sm">{j.description}</div>}

            <div className="mt-3">
              <div className="text-sm font-semibold">Required certificates</div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {certTypes.map((ct: CertType) => {
                  const checked = (selectedReqCerts[j.id] || []).includes(ct.id);
                  return (
                    <label key={ct.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggleReq(j.id, ct.id)} />
                      {ct.name}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
