"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  listCustomerAgreementTemplates,
  agreementTypeLabel,
  type CustomerAgreementTemplate,
} from "../../../../lib/agreements";
import {
  getMyCustomerOrg,
  listScopes,
  listCustomerScopeReq,
  Scope,
  CustomerScopeRequirement,
} from "../../../../lib/customers";
import { listCertTypes, CertType } from "../../../../lib/documents";
import { uploadJobFile } from "../../../../lib/jobFiles";

type JobVisibilityMode = "public" | "qualified_only" | "approved_only";

async function setJobScopes(jobId: string, scopeIds: string[]) {
  const { error: delErr } = await supabase
    .from("job_scopes")
    .delete()
    .eq("job_id", jobId);
  if (delErr) throw delErr;

  if (!scopeIds.length) return;

  const { error } = await supabase
    .from("job_scopes")
    .insert(scopeIds.map((sid) => ({ job_id: jobId, scope_id: sid })));

  if (error) throw error;
}

function scopeLabel(s: Scope) {
  return s.description && s.description.trim() ? s.description : s.name;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-[#0A2E5C]">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-[#4B5563]">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function CustomerJobsNewPage() {
  const router = useRouter();

  const [requiresOneTimeContract, setRequiresOneTimeContract] = useState(false);
  const [agreementTemplates, setAgreementTemplates] = useState<
    CustomerAgreementTemplate[]
  >([]);
  const [agreementTemplateId, setAgreementTemplateId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string | null>(null);

  const [scopes, setScopes] = useState<Scope[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [custScopeReq, setCustScopeReq] = useState<CustomerScopeRequirement[]>(
    []
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [visibilityMode, setVisibilityMode] =
    useState<JobVisibilityMode>("public");

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

  const unionRequirements = useMemo(() => {
    if (!customerId) return [];
    const relevant = custScopeReq.filter((r) =>
      selectedScopeIds.includes(r.scope_id)
    );

    const map = new Map<
      string,
      { cert_type_id: string; min: number; scopes: Set<string> }
    >();

    for (const r of relevant) {
      const key = r.cert_type_id;
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          cert_type_id: key,
          min: r.min_count_in_team,
          scopes: new Set([r.scope_id]),
        });
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

    try {
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

      const [sc, ct, csr, templates] = await Promise.all([
        listScopes(),
        listCertTypes(),
        listCustomerScopeReq(org.id),
        listCustomerAgreementTemplates(org.id),
      ]);

      setScopes(sc);
      setCertTypes(ct);
      setCustScopeReq(csr);

      const oneTimeTemplates = templates.filter(
        (tpl) =>
          tpl.status === "active" &&
          tpl.template_type === "one_time_project_agreement" &&
          (tpl.applies_to === "per_job" || tpl.applies_to === "both")
      );

      setAgreementTemplates(oneTimeTemplates);

      const defaultTemplate = oneTimeTemplates.find((tpl) => tpl.is_default);
      setAgreementTemplateId(defaultTemplate?.id || "");
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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
      if (!customerId) {
        throw new Error("Customer org not found. Go to /customer/settings.");
      }
      if (!title.trim()) throw new Error("Title is required.");
      if (!deadline) throw new Error("Deadline is required.");
      if (selectedScopeIds.length === 0) {
        throw new Error("Select at least one scope.");
      }

      const budgetNum = parseBudgetToNumber(budget);
      if (budgetNum === null) {
        throw new Error("Budget is required (enter a positive number).");
      }

      if (requiresOneTimeContract && !agreementTemplateId) {
        throw new Error("Select a one-time agreement template.");
      }

      const { data: userData, error: userErr } = await supabase.auth.getSession();
      if (userErr) throw userErr;
      if (!userData.session?.user) throw new Error("Not logged in");

      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          customer_user_id: userData.session.user.id,
          customer_id: customerId,
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          status: "open",
          deadline_date: deadline,
          budget_min: budgetNum,
          budget_max: budgetNum,
          visibility_mode: visibilityMode,
          requires_one_time_contract: requiresOneTimeContract,
          agreement_template_id: requiresOneTimeContract
            ? agreementTemplateId
            : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      await setJobScopes(job.id, selectedScopeIds);

      if (selectedFiles.length > 0) {
        for (const f of selectedFiles) {
          await uploadJobFile(job.id, f);
        }
      }

      router.push("/customer/jobs/active");
    } catch (e: any) {
      setErr(e.message ?? "Create job error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading job creation form...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-[#0A2E5C]">
          Create New Job
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          Add project details, select scopes, review required certificates,
          choose agreement rules, and attach files for contractors.
        </p>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <SectionCard title="Job Details">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Job title
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
              placeholder="Job title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Location
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-[#111827]">
            Description
          </label>
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Deadline
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={saving}
            />
            <p className="mt-1 text-xs text-[#6B7280]">
              Contractors should propose timelines that fit within this deadline.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Budget
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
              placeholder="e.g. 3500"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              disabled={saving}
            />
            <p className="mt-1 text-xs text-[#6B7280]">
              Stored as one amount in both budget_min and budget_max.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Contractor Visibility"
        description="Choose who can see this job in the contractor marketplace."
      >
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              visibilityMode === "public"
                ? "border-[#1F6FB5] bg-[#EAF3FF]"
                : "border-[#D9E2EC] bg-white hover:bg-[#F8FAFC]"
            }`}
          >
            <input
              type="radio"
              name="visibilityMode"
              checked={visibilityMode === "public"}
              onChange={() => setVisibilityMode("public")}
              disabled={saving}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-[#111827]">
                Show to all contractors
              </span>
              <span className="mt-1 block text-xs text-[#6B7280]">
                Any contractor can see the job and open the details page.
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              visibilityMode === "qualified_only"
                ? "border-[#1F6FB5] bg-[#EAF3FF]"
                : "border-[#D9E2EC] bg-white hover:bg-[#F8FAFC]"
            }`}
          >
            <input
              type="radio"
              name="visibilityMode"
              checked={visibilityMode === "qualified_only"}
              onChange={() => setVisibilityMode("qualified_only")}
              disabled={saving}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-[#111827]">
                Show only qualified contractors
              </span>
              <span className="mt-1 block text-xs text-[#6B7280]">
                MVP behavior for now: visible only to approved contractors for
                this customer.
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              visibilityMode === "approved_only"
                ? "border-[#1F6FB5] bg-[#EAF3FF]"
                : "border-[#D9E2EC] bg-white hover:bg-[#F8FAFC]"
            }`}
          >
            <input
              type="radio"
              name="visibilityMode"
              checked={visibilityMode === "approved_only"}
              onChange={() => setVisibilityMode("approved_only")}
              disabled={saving}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-[#111827]">
                Show only approved contractors
              </span>
              <span className="mt-1 block text-xs text-[#6B7280]">
                Only contractors already approved in your vendor list can see
                this job.
              </span>
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Agreement for This Job"
        description="Mark this job as requiring a one-time contract and choose the template that should be used for this project."
      >
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={requiresOneTimeContract}
              onChange={(e) => {
                const checked = e.target.checked;
                setRequiresOneTimeContract(checked);
                if (!checked) {
                  setAgreementTemplateId("");
                } else {
                  const defaultTemplate = agreementTemplates.find(
                    (tpl) => tpl.is_default
                  );
                  setAgreementTemplateId(defaultTemplate?.id || "");
                }
              }}
              disabled={saving}
            />
            <span className="text-sm leading-6 text-[#111827]">
              This job requires a one-time contract.
            </span>
          </label>

          {requiresOneTimeContract ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                One-time agreement template
              </label>
              <select
                className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                value={agreementTemplateId}
                onChange={(e) => setAgreementTemplateId(e.target.value)}
                disabled={saving}
              >
                <option value="">Select template...</option>
                {agreementTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                    {tpl.is_default ? " • Default" : ""} •{" "}
                    {agreementTypeLabel(tpl.template_type)}
                  </option>
                ))}
              </select>

              {agreementTemplates.length === 0 ? (
                <div className="mt-2 text-xs text-[#B45309]">
                  No active one-time agreement templates found. Upload one in
                  Customer → Agreements first.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Scopes"
        description="Select all work scopes that apply to this project."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {scopes.map((s) => {
            const checked = selectedScopeIds.includes(s.id);

            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  checked
                    ? "border-[#1F6FB5] bg-[#EAF3FF]"
                    : "border-[#D9E2EC] bg-white hover:bg-[#F8FAFC]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleScope(s.id)}
                  disabled={saving}
                  className="mt-1"
                />
                <span className="text-sm text-[#111827]">{scopeLabel(s)}</span>
              </label>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-[#6B7280]">
          Selected: {selectedScopes.length ? selectedScopes.join(" • ") : "none"}
        </p>
      </SectionCard>

      <SectionCard
        title="Requirements for This Job"
        description="Combined certification requirements based on the scopes you selected."
      >
        {selectedScopeIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D9E2EC] bg-[#FBFDFF] p-4 text-sm text-[#4B5563]">
            Select scopes to see requirements.
          </div>
        ) : unionRequirements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D9E2EC] bg-[#FBFDFF] p-4 text-sm text-[#4B5563]">
            No certificate requirements configured for these scopes yet.
          </div>
        ) : (
          <div className="space-y-3">
            {unionRequirements.map((r) => (
              <div
                key={r.cert_type_id}
                className="flex flex-col gap-3 rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-[#111827]">
                    {r.cert_name}
                  </div>
                  <div className="mt-1 text-xs text-[#6B7280]">
                    From scopes: {r.scopes.join(", ")}
                  </div>
                </div>

                <div className="text-sm text-[#111827]">
                  Min in team: <span className="font-semibold">{r.min}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-[#6B7280]">
          Configure requirements in{" "}
          <a className="underline" href="/customer/settings">
            Settings
          </a>
          .
        </p>
      </SectionCard>

      <SectionCard
        title="Project Files"
        description="Upload documents, specs, and photos for contractors."
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]">
            Choose files
            <input
              type="file"
              className="hidden"
              multiple
              onChange={(e) => onPickFiles(e.target.files)}
              disabled={saving}
            />
          </label>
        </div>

        {selectedFiles.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#D9E2EC] bg-[#FBFDFF] p-4 text-sm text-[#4B5563]">
            No files selected.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedFiles.map((f, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 rounded-xl border border-[#D9E2EC] bg-white p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#111827]">
                    {f.name}
                  </div>
                  <div className="mt-1 text-xs text-[#6B7280]">
                    {(f.size / 1024 / 1024).toFixed(2)} MB •{" "}
                    {f.type || "unknown type"}
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                  onClick={() => removePickedFile(idx)}
                  disabled={saving}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-[#6B7280]">
          Files are stored in bucket <span className="font-medium">job-files</span>{" "}
          under <code>jobs/&lt;jobId&gt;/...</code>
        </p>
      </SectionCard>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[#4B5563]">
            Ready to publish this job for contractors.
          </div>

          <button
            className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white transition ${
              saving ? "bg-[#9CA3AF]" : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
            }`}
            onClick={createJob}
            disabled={saving}
          >
            {saving ? "Creating..." : "Create Job"}
          </button>
        </div>
      </section>
    </main>
  );
}