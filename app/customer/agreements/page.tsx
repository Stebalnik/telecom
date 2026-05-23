"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { getMyCustomer } from "../../../lib/customers";
import {
  agreementTypeLabel,
  archiveCustomerAgreementTemplate,
  createCustomerAgreementTemplate,
  createManualCustomerAgreement,
  getAgreementFileUrl,
  listCustomerAgreements,
  listCustomerAgreementTemplates,
  setCustomerAgreementTemplateDefault,
  type AgreementAppliesTo,
  type AgreementTemplateType,
  type CustomerAgreement,
  type CustomerAgreementTemplate,
} from "../../../lib/agreements";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type AgreementFilter = "all" | "awaiting" | "signed" | "manual";

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();

  const cls =
    normalized === "signed"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalized === "sent" || normalized === "awaiting_signature"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : normalized === "archived" || normalized === "rejected"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${cls}`}>
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
      <div className="text-sm text-[#4B5563]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#111827]">{value}</div>
      <div className="mt-1 text-xs text-[#6B7280]">{detail}</div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#1F6FB5] text-white"
          : "border border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
      }`}
    >
      {children}
    </button>
  );
}

function WorkflowStep({
  step,
  title,
  detail,
}: {
  step: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#1F6FB5]">
        {step}
      </div>
      <div className="mt-2 text-sm font-semibold text-[#111827]">{title}</div>
      <div className="mt-1 text-sm leading-6 text-[#4B5563]">{detail}</div>
    </div>
  );
}

function TemplateTypeBadge({
  type,
}: {
  type: AgreementTemplateType;
}) {
  return (
    <span className="inline-flex rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#111827]">
      {agreementTypeLabel(type)}
    </span>
  );
}

export default function CustomerAgreementsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string>("");
  const [templates, setTemplates] = useState<CustomerAgreementTemplate[]>([]);
  const [agreements, setAgreements] = useState<CustomerAgreement[]>([]);

  const [templateType, setTemplateType] = useState<AgreementTemplateType>("msa");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [appliesTo, setAppliesTo] = useState<AgreementAppliesTo>("both");
  const [isDefault, setIsDefault] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const [manualType, setManualType] =
    useState<AgreementTemplateType>("one_time_project_agreement");
  const [manualTitle, setManualTitle] = useState("");
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [agreementFilter, setAgreementFilter] = useState<AgreementFilter>("all");

  const activeTemplates = useMemo(
    () => templates.filter((x) => x.status === "active"),
    [templates]
  );

  const awaitingCount = useMemo(
    () => agreements.filter((x) => x.status === "awaiting_signature" || x.status === "sent").length,
    [agreements]
  );

  const signedCount = useMemo(
    () => agreements.filter((x) => x.status === "signed").length,
    [agreements]
  );

  const manualCount = useMemo(
    () => agreements.filter((x) => x.source === "manual_upload").length,
    [agreements]
  );

  const filteredAgreements = useMemo(() => {
    return agreements.filter((agreement) => {
      if (agreementFilter === "awaiting") {
        return ["awaiting_signature", "sent"].includes(agreement.status);
      }

      if (agreementFilter === "signed") {
        return agreement.status === "signed";
      }

      if (agreementFilter === "manual") {
        return agreement.source === "manual_upload";
      }

      return true;
    });
  }, [agreements, agreementFilter]);

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

      const customer = await getMyCustomer();

      if (!customer?.id) {
        throw new Error("Customer profile not found.");
      }

      setCustomerId(customer.id);

      const [tpls, agrs] = await Promise.all([
        listCustomerAgreementTemplates(customer.id),
        listCustomerAgreements(customer.id),
      ]);

      setTemplates(tpls);
      setAgreements(agrs);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to load agreements."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUploadTemplate() {
    try {
      setErr(null);

      if (!customerId) throw new Error("Customer not found.");
      if (!templateTitle.trim()) throw new Error("Template title is required.");
      if (!templateFile) throw new Error("Attach a template file.");

      setBusy("upload-template");

      await createCustomerAgreementTemplate({
        customerId,
        templateType,
        title: templateTitle.trim(),
        description: templateDescription.trim(),
        appliesTo,
        isDefault,
        file: templateFile,
      });

      setTemplateTitle("");
      setTemplateDescription("");
      setAppliesTo("both");
      setIsDefault(false);
      setTemplateFile(null);

      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to upload template."));
    } finally {
      setBusy(null);
    }
  }

  async function handleUploadManualAgreement() {
    try {
      setErr(null);

      if (!customerId) throw new Error("Customer not found.");
      if (!manualTitle.trim()) throw new Error("Agreement title is required.");
      if (!manualFile) throw new Error("Attach an agreement file.");

      setBusy("upload-manual");

      await createManualCustomerAgreement({
        customerId,
        agreementType: manualType,
        title: manualTitle.trim(),
        file: manualFile,
      });

      setManualTitle("");
      setManualFile(null);

      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to upload agreement."));
    } finally {
      setBusy(null);
    }
  }

  async function handleOpen(path: string) {
    try {
      const url = await getAgreementFileUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to open file."));
    }
  }

  async function handleSetDefault(templateId: string) {
    try {
      setBusy(`default:${templateId}`);
      setErr(null);
      await setCustomerAgreementTemplateDefault(templateId);
      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to set default."));
    } finally {
      setBusy(null);
    }
  }

  async function handleArchiveTemplate(templateId: string) {
    try {
      setBusy(`archive:${templateId}`);
      setErr(null);
      await archiveCustomerAgreementTemplate(templateId);
      await load();
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Failed to archive template."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                Agreements
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Upload your standard agreement templates, manage defaults, and
                track sent or signed agreements.
              </p>
            </div>

            <Link
              href="/customer"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to customer
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Active templates"
              value={activeTemplates.length}
              detail="Ready for onboarding or per-job use"
            />
            <SummaryCard
              label="Awaiting signature"
              value={awaitingCount}
              detail="Sent or pending contractor action"
            />
            <SummaryCard
              label="Signed agreements"
              value={signedCount}
              detail="Executed records on file"
            />
            <SummaryCard
              label="Manual uploads"
              value={manualCount}
              detail="Prepared outside the template flow"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">
              Agreement workflow
            </h2>
            <p className="mt-1 text-sm text-[#4B5563]">
              Keep templates current, track signature status, and keep manual
              agreements visible beside generated records.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <WorkflowStep
              step="Step 1"
              title="Prepare templates"
              detail="Upload active defaults for onboarding and per-job agreements."
            />
            <WorkflowStep
              step="Step 2"
              title="Send or upload"
              detail="Use templates for repeatable agreements or add prepared records manually."
            />
            <WorkflowStep
              step="Step 3"
              title="Track execution"
              detail="Review awaiting, signed, and manual records from one queue."
            />
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm text-sm text-[#4B5563]">
            Loading agreements...
          </section>
        ) : null}

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        {!loading ? (
          <>
            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Upload agreement template
              </h2>
              <p className="mt-1 text-sm text-[#4B5563]">
                Store your default MSA, service agreement, or one-time project agreement with your company details already filled in.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    Template type
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as AgreementTemplateType)}
                  >
                    <option value="msa">Master Service Agreement</option>
                    <option value="service_agreement">Service Agreement</option>
                    <option value="one_time_project_agreement">One-time Project Agreement</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    Applies to
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                    value={appliesTo}
                    onChange={(e) => setAppliesTo(e.target.value as AgreementAppliesTo)}
                  >
                    <option value="onboarding">Onboarding</option>
                    <option value="per_job">Per job</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    Title
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    placeholder="e.g. LEOTEOR Master Service Agreement"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    Description
                  </label>
                  <textarea
                    className="min-h-[96px] w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Optional note about when to use this agreement."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    File
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-start gap-3 rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                    />
                    <span className="text-sm leading-6 text-[#111827]">
                      Set this as the default template for this agreement type.
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleUploadTemplate}
                  disabled={busy === "upload-template"}
                  className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "upload-template" ? "Uploading..." : "Upload template"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Templates
              </h2>

              {templates.length === 0 ? (
                <div className="mt-4 text-sm text-[#4B5563]">
                  No agreement templates uploaded yet.
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-[#111827]">
                              {tpl.title}
                            </div>
                            <TemplateTypeBadge type={tpl.template_type} />
                            <StatusBadge status={tpl.status} />
                            {tpl.is_default ? (
                              <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                                Default
                              </span>
                            ) : null}
                          </div>

                          {tpl.description ? (
                            <div className="mt-2 text-sm text-[#4B5563]">
                              {tpl.description}
                            </div>
                          ) : null}

                          <div className="mt-3 text-xs text-[#6B7280]">
                            Applies to: {tpl.applies_to.replaceAll("_", " ")} • Created: {formatDateTime(tpl.created_at)}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpen(tpl.file_path)}
                            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                          >
                            Open
                          </button>

                          {!tpl.is_default && tpl.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(tpl.id)}
                              disabled={busy === `default:${tpl.id}`}
                              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:opacity-60"
                            >
                              {busy === `default:${tpl.id}` ? "Saving..." : "Set default"}
                            </button>
                          ) : null}

                          {tpl.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => handleArchiveTemplate(tpl.id)}
                              disabled={busy === `archive:${tpl.id}`}
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              {busy === `archive:${tpl.id}` ? "Archiving..." : "Archive"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Upload manual agreement
              </h2>
              <p className="mt-1 text-sm text-[#4B5563]">
                Add an already prepared agreement record directly to the system.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    Agreement type
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as AgreementTemplateType)}
                  >
                    <option value="msa">Master Service Agreement</option>
                    <option value="service_agreement">Service Agreement</option>
                    <option value="one_time_project_agreement">One-time Project Agreement</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    Title
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g. Verizon tower project agreement"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    File
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setManualFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleUploadManualAgreement}
                  disabled={busy === "upload-manual"}
                  className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "upload-manual" ? "Uploading..." : "Upload agreement"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#111827]">
                    Sent / executed agreements
                  </h2>
                  <p className="mt-1 text-sm text-[#4B5563]">
                    Filter the queue by signature state or manual upload source.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={agreementFilter === "all"}
                    onClick={() => setAgreementFilter("all")}
                  >
                    All ({agreements.length})
                  </FilterButton>
                  <FilterButton
                    active={agreementFilter === "awaiting"}
                    onClick={() => setAgreementFilter("awaiting")}
                  >
                    Awaiting ({awaitingCount})
                  </FilterButton>
                  <FilterButton
                    active={agreementFilter === "signed"}
                    onClick={() => setAgreementFilter("signed")}
                  >
                    Signed ({signedCount})
                  </FilterButton>
                  <FilterButton
                    active={agreementFilter === "manual"}
                    onClick={() => setAgreementFilter("manual")}
                  >
                    Manual ({manualCount})
                  </FilterButton>
                </div>
              </div>

              {filteredAgreements.length === 0 ? (
                <div className="mt-4 text-sm text-[#4B5563]">
                  No agreement records found for this filter.
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  {filteredAgreements.map((agreement) => {
                    const contractor = Array.isArray(agreement.contractor)
                      ? agreement.contractor[0] ?? null
                      : agreement.contractor ?? null;

                    const job = Array.isArray(agreement.job)
                      ? agreement.job[0] ?? null
                      : agreement.job ?? null;

                    return (
                      <div
                        key={agreement.id}
                        className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-[#111827]">
                                {agreement.title}
                              </div>
                              <TemplateTypeBadge type={agreement.agreement_type} />
                              <StatusBadge status={agreement.status} />
                            </div>

                            <div className="mt-2 text-sm text-[#4B5563]">
                              Contractor:{" "}
                              <span className="font-medium text-[#111827]">
                                {contractor?.legal_name || contractor?.dba_name || "—"}
                              </span>
                              {" • "}
                              Job:{" "}
                              <span className="font-medium text-[#111827]">
                                {job?.title || "—"}
                              </span>
                            </div>

                            <div className="mt-2 text-xs text-[#6B7280]">
                              Source: {agreement.source} • Created: {formatDateTime(agreement.created_at)} • Sent: {formatDateTime(agreement.sent_at)} • Signed: {formatDateTime(agreement.signed_at)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpen(agreement.file_path)}
                              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
