"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  getMyCustomerOrg,
  listScopes,
  listCustomerScopeReq,
  Scope,
  CustomerScopeRequirement,
} from "../../../../lib/customers";
import { listCertTypes, CertType } from "../../../../lib/documents";
import { uploadJobFile } from "../../../../lib/jobFiles";

async function setJobScopes(jobId: string, scopeIds: string[]) {
  const { error: delErr } = await supabase.from("job_scopes").delete().eq("job_id", jobId);
  if (delErr) throw delErr;

  if (!scopeIds.length) return;

  const { error } = await supabase
    .from("job_scopes")
    .insert(scopeIds.map((sid) => ({ job_id: jobId, scope_id: sid })));

  if (error) throw error;
}

function scopeLabel(s: Scope) {
  // показываем description если есть, иначе name
  return (s.description && s.description.trim()) ? s.description : s.name;
}

export default function CustomerJobsNewPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [scopes, setScopes] = useState<Scope[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [custScopeReq, setCustScopeReq] = useState<CustomerScopeRequirement[]>([]);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState(""); // YYYY-MM-DD
  const [budget, setBudget] = useState<string>(""); // USD amount as string
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);

  // files to upload on create
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const certNameById = useMemo(() => {
    const m: Record<string, string> = {};
    certTypes.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [certTypes]);

  const scopeLabelById = useMemo(() => {
    const m: Record<string, string> = {};
    scopes.forEach((s) => (m[s.id] = scopeLabel(s)));
    return m;
  }, [scopes]);

  const selectedScopes = useMemo(() => {
    return selectedScopeIds.map((id) => scopeLabelById[id]).filter(Boolean);
  }, [selectedScopeIds, scopeLabelById]);

  // Union requirements based on selected scopes (max-min logic)
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
        scopes: Array.from(x.scopes).map((sid) => scopeLabelById[sid] ?? sid),
      }))
      .sort((a, b) => a.cert_name.localeCompare(b.cert_name));
  }, [custScopeReq, selectedScopeIds, certNameById, scopeLabelById, customerId]);

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

  function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      setSelectedFiles([]);
      return;
    }
    setSelectedFiles(Array.from(files));
  }

  function removePickedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function parseBudgetToNumber(value: string): number | null {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  async function createJob() {
    setErr(null);
    setSaving(true);

    try {
      if (!customerId) throw new Error("Customer org not found. Go to /customer/settings.");
      if (!title.trim()) throw new Error("Title is required.");
      if (!deadline) throw new Error("Deadline is required.");
      if (selectedScopeIds.length === 0) throw new Error("Select at least one scope.");

      const budgetNum = parseBudgetToNumber(budget);
      if (budgetNum === null) throw new Error("Budget is required (enter a positive number).");

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData.user) throw new Error("Not logged in");

      // 1) create job
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
          // store budget into budget_min/budget_max (single price)
          budget_min: budgetNum,
          budget_max: budgetNum,
        })
        .select("id")
        .single();

      if (error) throw error;

      // 2) set scopes
      await setJobScopes(job.id, selectedScopeIds);

      // 3) upload files (optional)
      if (selectedFiles.length > 0) {
        for (const f of selectedFiles) {
          await uploadJobFile(job.id, f);
        }
      }

      router.push("/customer/jobs/active");
    } catch (e: any) {
      setErr(e.message ?? "Create job error");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="rounded border p-4 space-y-4">
        <h2 className="text-lg font-semibold">Create new job</h2>

        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border p-2"
            placeholder="Job title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
          />

          <input
            className="rounded border p-2"
            placeholder="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={saving}
          />
        </div>

        <textarea
          className="w-full rounded border p-2"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={saving}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Deadline (required)</div>
            <input
              className="rounded border p-2 w-full"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={saving}
            />
            <div className="text-xs text-gray-600">
              Contractors must pick a timeframe that does not exceed this deadline.
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-semibold">Budget (required)</div>
            <input
              className="rounded border p-2 w-full"
              placeholder="e.g. 3500"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={saving}
            />
            <div className="text-xs text-gray-600">
              Stored as a single price (budget_min = budget_max).
            </div>
          </div>
        </div>

        <div className="rounded border p-3 space-y-2">
          <div className="font-semibold">Scopes (select all that apply)</div>

          <div className="grid gap-2 md:grid-cols-2">
            {scopes.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedScopeIds.includes(s.id)}
                  onChange={() => toggleScope(s.id)}
                  disabled={saving}
                />
                <span>{scopeLabel(s)}</span>
              </label>
            ))}
          </div>

          <div className="text-xs text-gray-600">
            Selected: {selectedScopes.length ? selectedScopes.join(" • ") : "none"}
          </div>
        </div>

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

        <div className="rounded border p-3 space-y-2">
          <div className="font-semibold">Project files (optional)</div>
          <div className="text-sm text-gray-600">
            Upload documents/specs/photos for contractors. Files will be attached to this job.
          </div>

          <label className="inline-block rounded bg-black px-4 py-2 text-white cursor-pointer">
            Choose files
            <input
              type="file"
              className="hidden"
              multiple
              onChange={(e) => onPickFiles(e.target.files)}
              disabled={saving}
            />
          </label>

          {selectedFiles.length === 0 ? (
            <div className="text-sm text-gray-600">No files selected.</div>
          ) : (
            <div className="space-y-2">
              {selectedFiles.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 rounded border p-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{f.name}</div>
                    <div className="text-xs text-gray-600">
                      {(f.size / 1024 / 1024).toFixed(2)} MB • {f.type || "unknown type"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    onClick={() => removePickedFile(idx)}
                    disabled={saving}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-600">
            Files are stored in Storage bucket <b>job-files</b> under <code>jobs/&lt;jobId&gt;/...</code>
          </div>
        </div>

        <button
          className={"rounded px-4 py-2 text-white " + (saving ? "bg-gray-400" : "bg-black")}
          onClick={createJob}
          disabled={saving}
        >
          {saving ? "Creating..." : "Create job"}
        </button>
      </section>
    </div>
  );
}