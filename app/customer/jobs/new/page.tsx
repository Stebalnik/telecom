"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import { unwrapSupabase } from "../../../../lib/errors/unwrapSupabase";
import { withErrorLogging } from "../../../../lib/errors/withErrorLogging";
import {
  listCustomerAgreementTemplates,
  agreementTypeLabel,
  type CustomerAgreementTemplate,
} from "../../../../lib/agreements";
import {
  getMyCustomerOrg,
  listScopes,
  listCustomerScopeReq,
  type Scope,
  type CustomerScopeRequirement,
} from "../../../../lib/customers";
import { listCertTypes, type CertType } from "../../../../lib/documents";
import { uploadJobFile } from "../../../../lib/jobFiles";
import { track } from "../../../../lib/track";

type JobVisibilityMode = "public" | "qualified_only" | "approved_only";

type JobTemplate = {
  id: string;
  name: string;
  title: string;
  description: string;
  budget: string;
  scopeKeywords: string[];
};

const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: "tower-work",
    name: "Tower work",
    title: "Tower site field work",
    description:
      "Tower field work including site access, safety setup, climbing scope, installation or maintenance tasks, closeout photos, and customer acceptance requirements.",
    budget: "7500",
    scopeKeywords: ["tower", "climb", "antenna", "site"],
  },
  {
    id: "fiber-installation",
    name: "Fiber installation",
    title: "Fiber installation project",
    description:
      "Fiber installation work including pathway review, cable placement, testing, labeling, documentation, and handoff requirements.",
    budget: "6500",
    scopeKeywords: ["fiber", "cable", "splice", "installation"],
  },
  {
    id: "site-survey",
    name: "Site survey",
    title: "Telecom site survey",
    description:
      "Site survey including access review, photos, measurements, equipment inventory, constraints, and recommendation notes for customer review.",
    budget: "2500",
    scopeKeywords: ["survey", "site", "assessment"],
  },
  {
    id: "civil-work",
    name: "Civil work",
    title: "Telecom civil work",
    description:
      "Civil scope including trenching, foundations, conduit, restoration, safety controls, schedule constraints, and closeout documentation.",
    budget: "12000",
    scopeKeywords: ["civil", "trench", "foundation", "conduit"],
  },
  {
    id: "electrical",
    name: "Electrical",
    title: "Telecom electrical scope",
    description:
      "Electrical work including power review, installation, grounding, testing, labeling, safety requirements, and final documentation.",
    budget: "8500",
    scopeKeywords: ["electrical", "power", "ground", "utility"],
  },
  {
    id: "closeout-package",
    name: "Closeout package",
    title: "Closeout package review",
    description:
      "Closeout package work including photo collection, as-built details, document review, missing item resolution, and final package submission.",
    budget: "1800",
    scopeKeywords: ["closeout", "photo", "document", "package"],
  },
  {
    id: "maintenance",
    name: "Maintenance",
    title: "Telecom maintenance work",
    description:
      "Maintenance scope including troubleshooting, repair work, verification, site notes, customer updates, and completion evidence.",
    budget: "4500",
    scopeKeywords: ["maintenance", "repair", "troubleshoot"],
  },
  {
    id: "emergency-repair",
    name: "Emergency repair",
    title: "Emergency telecom repair",
    description:
      "Urgent repair work including dispatch timing, outage impact, safety constraints, repair plan, verification steps, and closeout evidence.",
    budget: "9500",
    scopeKeywords: ["emergency", "repair", "maintenance", "outage"],
  },
];

async function setJobScopes(jobId: string, scopeIds: string[]) {
  const deleteResult = await supabase
    .from("job_scopes")
    .delete()
    .eq("job_id", jobId);

  unwrapSupabase(deleteResult, "delete_job_scopes_failed");

  if (!scopeIds.length) return;

  const insertResult = await supabase
    .from("job_scopes")
    .insert(scopeIds.map((sid) => ({ job_id: jobId, scope_id: sid })));

  unwrapSupabase(insertResult, "insert_job_scopes_failed");
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

function ReadinessItem({
  label,
  ready,
  detail,
}: {
  label: string;
  ready: boolean;
  detail: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        ready
          ? "border-green-200 bg-green-50"
          : "border-[#D9E2EC] bg-[#F8FAFC]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#111827]">{label}</div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            ready
              ? "border-green-200 bg-white text-green-700"
              : "border-[#D9E2EC] bg-white text-[#4B5563]"
          }`}
        >
          {ready ? "Ready" : "Needed"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#4B5563]">{detail}</p>
    </div>
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
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [visibilityMode, setVisibilityMode] =
    useState<JobVisibilityMode>("public");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const certNameById = useMemo(() => {
    const m: Record<string, string> = {};
    certTypes.forEach((c) => {
      m[c.id] = c.name;
    });
    return m;
  }, [certTypes]);

  const scopeLabelById = useMemo(() => {
    const m: Record<string, string> = {};
    scopes.forEach((s) => {
      m[s.id] = scopeLabel(s);
    });
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

  const budgetNum = useMemo(() => parseBudgetToNumber(budget), [budget]);
  const setupChecks = useMemo(
    () => [
      {
        label: "Job details",
        ready: Boolean(
          title.trim() &&
            location.trim() &&
            description.trim() &&
            deadline &&
            budgetNum !== null
        ),
        detail: title.trim()
          ? "Title, market, description, timeline, and budget are used to publish the opportunity."
          : "Add a title, market, description, timeline, and positive budget before publishing.",
      },
      {
        label: "Scopes",
        ready: selectedScopeIds.length > 0,
        detail: selectedScopeIds.length
          ? `${selectedScopeIds.length} scope${selectedScopeIds.length === 1 ? "" : "s"} selected.`
          : "Select at least one work scope so contractors can qualify the job.",
      },
      {
        label: "Visibility",
        ready: true,
        detail:
          visibilityMode === "public"
            ? "All contractors can discover this job."
            : visibilityMode === "qualified_only"
              ? "Only qualified or approved contractors should discover this job."
              : "Only approved contractors should discover this job.",
      },
      {
        label: "Agreement",
        ready: !requiresOneTimeContract || Boolean(agreementTemplateId),
        detail: requiresOneTimeContract
          ? "A one-time agreement template is required for this job."
          : "No one-time agreement is required for this job.",
      },
    ],
    [
      agreementTemplateId,
      budgetNum,
      deadline,
      description,
      location,
      requiresOneTimeContract,
      selectedScopeIds.length,
      title,
      visibilityMode,
    ]
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
        },
        {
          message: "customer_job_create_page_load_failed",
          code: "customer_job_create_page_load_failed",
          source: "frontend",
          area: "customer",
          path: "/customer/jobs/new",
          role: "customer",
        }
      );
    } catch {
      setErr("Unable to load the job creation form. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void track("customer_job_started", {
      role: "customer",
      path: "/customer/jobs/new",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleScope(scopeId: string) {
    setSelectedScopeIds((prev) => {
      if (prev.includes(scopeId)) {
        return prev.filter((x) => x !== scopeId);
      }
      return [...prev, scopeId];
    });
  }

  function applyTemplate(template: JobTemplate) {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setDescription(template.description);
    setBudget(template.budget);

    const keywordMatches = scopes
      .filter((scope) => {
        const label = scopeLabel(scope).toLowerCase();
        return template.scopeKeywords.some((keyword) =>
          label.includes(keyword.toLowerCase())
        );
      })
      .map((scope) => scope.id);

    if (keywordMatches.length) {
      setSelectedScopeIds(Array.from(new Set(keywordMatches)));
    }

    void track("customer_job_template_selected", {
      role: "customer",
      path: "/customer/jobs/new",
      meta: {
        templateId: template.id,
      },
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
      await withErrorLogging(
        async () => {
          if (!customerId) {
            throw new Error("Customer org not found. Go to /customer/settings.");
          }

          if (!title.trim()) {
            throw new Error("Title is required.");
          }

          if (!location.trim()) {
            throw new Error("Market is required.");
          }

          if (!description.trim()) {
            throw new Error("Description is required.");
          }

          if (!deadline) {
            throw new Error("Deadline is required.");
          }

          if (selectedScopeIds.length === 0) {
            throw new Error("Select at least one scope.");
          }

          if (budgetNum === null) {
            throw new Error("Budget is required (enter a positive number).");
          }

          if (requiresOneTimeContract && !agreementTemplateId) {
            throw new Error("Select a one-time agreement template.");
          }

          const sessionResult = await supabase.auth.getSession();

          if (sessionResult.error) {
            throw sessionResult.error;
          }

          const sessionUser = sessionResult.data.session?.user;
          if (!sessionUser) {
            throw new Error("Not logged in");
          }

          const insertResult = await supabase
            .from("jobs")
            .insert({
              customer_user_id: sessionUser.id,
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

          const job = unwrapSupabase(insertResult, "create_job_failed");

          await withErrorLogging(
            () => setJobScopes(job.id, selectedScopeIds),
            {
              message: "set_job_scopes_failed",
              code: "set_job_scopes_failed",
              source: "frontend",
              area: "jobs",
              path: "/customer/jobs/new",
              role: "customer",
              details: {
                jobId: job.id,
                scopeIds: selectedScopeIds,
              },
            }
          );

          if (selectedFiles.length > 0) {
            for (const f of selectedFiles) {
              await withErrorLogging(
                () => uploadJobFile(job.id, f),
                {
                  message: "upload_job_file_failed",
                  code: "upload_job_file_failed",
                  source: "frontend",
                  area: "jobs",
                  path: "/customer/jobs/new",
                  role: "customer",
                  details: {
                    jobId: job.id,
                    fileName: f.name,
                    fileSize: f.size,
                    fileType: f.type || null,
                  },
                }
              );
            }
          }

          await track("customer_create_job_submitted", {
            role: "customer",
            meta: {
              jobId: job.id,
              visibilityMode,
              scopeCount: selectedScopeIds.length,
              fileCount: selectedFiles.length,
              requiresOneTimeContract,
            },
          });

          router.push("/customer/jobs/active");
        },
        {
          message: "create_customer_job_failed",
          code: "create_customer_job_failed",
          source: "frontend",
          area: "jobs",
          path: "/customer/jobs/new",
          role: "customer",
          details: {
            visibilityMode,
            scopeCount: selectedScopeIds.length,
            fileCount: selectedFiles.length,
            requiresOneTimeContract,
          },
        }
      );
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Create job error";

      if (
        message === "Title is required." ||
        message === "Market is required." ||
        message === "Description is required." ||
        message === "Deadline is required." ||
        message === "Select at least one scope." ||
        message === "Budget is required (enter a positive number)." ||
        message === "Select a one-time agreement template." ||
        message === "Customer org not found. Go to /customer/settings."
      ) {
        setErr(message);
      } else {
        setErr("Unable to create the job. Please try again.");
      }
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
          Post a telecom job fast
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          Capture the essentials contractors need first: title, market, scope,
          public description, timeline, certifications, and optional files.
        </p>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <SectionCard
        title="Job Setup Checklist"
        description="Complete the fast-posting essentials before publishing this job."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {setupChecks.map((check) => (
            <ReadinessItem
              key={check.label}
              label={check.label}
              ready={check.ready}
              detail={check.detail}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Fast job details"
        description="Use safe public-ready language. Do not include private contact info in title, market, or description."
      >
        <div className="mb-5 rounded-xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[#0A2E5C]">
              Start from a telecom template
            </h3>
            <p className="text-sm leading-6 text-[#4B5563]">
              Pick a common scope to prefill the title, public description,
              planning budget, and matching scopes when available.
            </p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {JOB_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                  selectedTemplateId === template.id
                    ? "border-[#1F6FB5] bg-white text-[#0A2E5C]"
                    : "border-[#D9E2EC] bg-white text-[#111827] hover:border-[#1F6FB5] hover:bg-[#F4F8FC]"
                }`}
                onClick={() => applyTemplate(template)}
                disabled={saving}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Job title
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
              placeholder="Tower compound cleanup and punch list"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Market
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
              placeholder="Dallas, TX"
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
            placeholder="Summarize the scope, site conditions, schedule expectations, and contractor requirements without adding emails, phone numbers, gate codes, or private contacts."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Timeline / target date
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={saving}
            />
            <p className="mt-1 text-xs text-[#6B7280]">
              Contractors should propose timelines that fit within this target date.
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
              Use a planning amount contractors can use for initial bid context.
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
            onClick={() => void createJob()}
            disabled={saving}
          >
            {saving ? "Creating..." : "Create Job"}
          </button>
        </div>
      </section>
    </main>
  );
}
