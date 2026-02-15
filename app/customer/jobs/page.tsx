"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import {
  getMyCustomerOrg,
  listScopes,
  listCustomerScopeReq,
  Scope,
  CustomerScopeRequirement,
} from "../../../lib/customers";
import { listCertTypes, CertType } from "../../../lib/documents";
import {
  listJobFilesForJobs,
  uploadJobFile,
  openJobFileSigned,
  deleteJobFile,
  JobFileRow,
} from "../../../lib/jobFiles";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
  customer_id: string | null;
  deadline_date: string | null; // YYYY-MM-DD
};

async function setJobScopes(jobId: string, scopeIds: string[]) {
  const { error: delErr } = await supabase.from("job_scopes").delete().eq("job_id", jobId);
  if (delErr) throw delErr;

  if (!scopeIds.length) return;

  const { error } = await supabase
    .from("job_scopes")
    .insert(scopeIds.map((sid) => ({ job_id: jobId, scope_id: sid })));

  if (error) throw error;
}

export default function CustomerJobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [custScopeReq, setCustScopeReq] = useState<CustomerScopeRequirement[]>([]);
  const [filesByJob, setFilesByJob] = useState<Record<string, JobFileRow[]>>({});

  // Create job form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState(""); // YYYY-MM-DD
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);

  const certNameById = useMemo(() => {
    const m: Record<string, string> = {};
    certTypes.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [certTypes]);

  const scopeNameById = useMemo(() => {
    const m: Record<string, string> = {};
    scopes.forEach((s) => (m[s.id] = s.name));
    return m;
  }, [scopes]);

  const selectedScopes = useMemo(() => {
    return selectedScopeIds.map((id) => scopeNameById[id]).filter(Boolean);
  }, [selectedScopeIds, scopeNameById]);

  const unionRequirements = useMemo(() => {
    if (!customerId) return [];
    const relevant = custScopeReq.filter((r) => selectedScopeIds.includes(r.scope_id));

    const map = new Map<string, { cert_type_id: string; min: number; scopes: Set<string> }>();

    for (const r of relevant) {
      const key = r.cert_type_id;
      const current = map.get(key);
      if (!current) {
        map.set(key, { cert_type_id: key, min: r.min_count_in_team, scopes: new Set([r.scope_id]) });
      } else {
        current.min = Math.max(current.min, r.min_count_in_team);
        current.scopes.add(r.scope_id);
      }
    }

    return Array.from(map.values())
      .map((x) => ({
        cert_type_id: x.cert_type_id,
        cert_name: certNameById[x.cert_type_id] ?? "Certificate",
        min: x.min,
        scopes: Array.from(x.scopes).map((sid) => scopeNameById[sid] ?? sid),
      }))
      .sort((a, b) => a.cert_name.localeCompare(b.cert_name));
  }, [custScopeReq, selectedScopeIds, certNameById, scopeNameById, customerId]);

  async function load() {
    setLoading(true);
    setErr(null);

    const profile = await getMyProfile();
    if (!profile) return router.replace("/login");
    if (profile.role !== "customer") return router.replace("/dashboard");

    const org = await getMyCustomerOrg();
    if (!org) {
      router.replace("/customer/settings");
      return;
    }

    try {
      setCustomerId(org.id);

      const [sc, ct, csr] = await Promise.all([
        listScopes(),
        listCertTypes(),
        listCustomerScopeReq(org.id),
      ]);

      setScopes(sc);
      setCertTypes(ct);
      setCustScopeReq(csr);

      const { data: j, error } = await supabase
        .from("jobs")
        .select("id,title,description,location,status,created_at,customer_id,deadline_date")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const jobsArr = (j || []) as JobRow[];
      setJobs(jobsArr);

      // load job files for these jobs
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

  function toggleScope(scopeId: string) {
    setSelectedScopeIds((prev) => {
      if (prev.includes(scopeId)) return prev.filter((x) => x !== scopeId);
      return [...prev, scopeId];
    });
  }

  async function createJob() {
    setErr(null);
    try {
      if (!customerId) throw new Error("Customer org not found. Go to /customer/settings.");
      if (!title.trim()) throw new Error("Title is required.");
      if (!deadline) throw new Error("Deadline is required.");
      if (selectedScopeIds.length === 0) throw new Error("Select at least one scope.");

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData.user) throw new Error("Not logged in");

      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          customer_user_id: userData.user.id,
          customer_id: customerId,
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          status: "open",
          deadline_date: deadline,
        })
        .select("id")
        .single();

      if (error) throw error;

      await setJobScopes(job.id, selectedScopeIds);

      // reset form
      setTitle("");
      setDescription("");
      setLocation("");
      setDeadline("");
      setSelectedScopeIds([]);

      await load();
    } catch (e: any) {
      setErr(e.message ?? "Create job error");
    }
  }

  async function onUpload(jobId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);

    try {
      for (const f of Array.from(files)) {
        await uploadJobFile(jobId, f);
      }
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Upload error");
    }
  }

  async function onDeleteFile(f: JobFileRow) {
    setErr(null);
    try {
      if (!confirm(`Delete file "${f.file_name}"?`)) return;
      await deleteJobFile(f);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Delete file error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <a className="underline text-sm" href="/customer">
          Back
        </a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Create Job */}
      <section className="rounded border p-4 space-y-4">
        <h2 className="text-lg font-semibold">Create new job</h2>

        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border p-2"
            placeholder="Job title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="rounded border p-2"
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <textarea
          className="w-full rounded border p-2"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Deadline (required)</div>
            <input
              className="rounded border p-2 w-full"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <div className="text-xs text-gray-600">
              Contractors must pick a timeframe that does not exceed this deadline.
            </div>
          </div>

          <div className="rounded border p-3 space-y-2">
            <div className="font-semibold">Scopes (select all that apply)</div>
            <div className="grid gap-2 md:grid-cols-3">
              {scopes.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedScopeIds.includes(s.id)}
                    onChange={() => toggleScope(s.id)}
                  />
                  <span className="capitalize">{s.name}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-gray-600">
              Selected: {selectedScopes.length ? selectedScopes.join(", ") : "none"}
            </div>
          </div>
        </div>

        {/* Requirements union */}
        <div className="rounded border p-3 space-y-2">
          <div className="font-semibold">Requirements for this job (union)</div>
          <div className="text-sm text-gray-600">
            Combined certification requirements based on selected scopes.
          </div>

          {selectedScopeIds.length === 0 && (
            <div className="text-sm text-gray-600">Select scopes to see requirements.</div>
          )}

          {selectedScopeIds.length > 0 && unionRequirements.length === 0 && (
            <div className="text-sm text-gray-600">
              No certificate requirements configured for these scopes. (Configure in Settings)
            </div>
          )}

          {unionRequirements.length > 0 && (
            <div className="space-y-2">
              {unionRequirements.map((r) => (
                <div key={r.cert_type_id} className="flex items-center justify-between gap-4 rounded border p-2">
                  <div className="text-sm">
                    <b>{r.cert_name}</b>
                    <div className="text-xs text-gray-600">From scopes: {r.scopes.join(", ")}</div>
                  </div>
                  <div className="text-sm">
                    min in team: <b>{r.min}</b>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-600">
            Tip: Configure requirements in{" "}
            <a className="underline" href="/customer/settings">
              Settings
            </a>
            .
          </div>
        </div>

        <button className="rounded bg-black px-4 py-2 text-white" onClick={createJob}>
          Create job
        </button>
      </section>

      {/* Jobs list */}
      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">My jobs</h2>

        {jobs.length === 0 && <p className="text-sm text-gray-600">No jobs yet.</p>}

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
                </div>

                {/* Project files */}
                <div className="rounded border p-3 space-y-2">
                  <div className="font-semibold">Project files</div>

                  <div className="text-sm text-gray-600">
                    Only eligible contractors (approved vendors) can view/download these files.
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="rounded bg-black px-4 py-2 text-white cursor-pointer">
                      Upload files
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        onChange={(e) => onUpload(j.id, e.target.files)}
                      />
                    </label>

                    <div className="text-xs text-gray-600">
                      Path format: jobs/{j.id}/...
                    </div>
                  </div>

                  {files.length === 0 && (
                    <div className="text-sm text-gray-600">No files uploaded yet.</div>
                  )}

                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded border p-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{f.file_name}</div>
                            <div className="text-xs text-gray-600 truncate">{f.file_path}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              className="rounded border px-3 py-1 text-sm"
                              onClick={() => openJobFileSigned(f.file_path)}
                            >
                              Download
                            </button>
                            <button
                              className="rounded border px-3 py-1 text-sm"
                              onClick={() => onDeleteFile(f)}
                            >
                              Delete
                            </button>
                          </div>
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
    </main>
  );
}
