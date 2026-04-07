"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  addCOISupportingFile,
  COIHistoryRow,
  COIPolicyRow,
  COIRow,
  COISupportingFileRow,
  createOrUpdateMyCOI,
  deleteCOIPolicy,
  EndorsementTypeRow,
  getMyCOI,
  InsuranceTypeRow,
  listCOIEndorsements,
  listCOIHistory,
  listCOIPolicies,
  listCOISupportingFiles,
  listEndorsementTypes,
  listInsuranceTypes,
  saveCOIEndorsements,
  upsertCOIPolicy,
} from "../../../lib/coi";
import { getMyCompany } from "../../../lib/contractor";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { getMyProfile } from "../../../lib/profile";
import { supabase } from "../../../lib/supabaseClient";

function iso(d?: string | null) {
  return d || "";
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseLimitSchemaKeys(
  limit_schema: unknown
): { key: string; label: string }[] {
  if (!limit_schema) return [];

  try {
    if (Array.isArray(limit_schema)) {
      return limit_schema.map((k) => ({ key: String(k), label: String(k) }));
    }

    if (
      typeof limit_schema === "object" &&
      limit_schema !== null &&
      "fields" in limit_schema &&
      Array.isArray((limit_schema as { fields?: unknown[] }).fields)
    ) {
      return ((limit_schema as { fields: Array<{ key?: unknown; label?: unknown }> }).fields).map(
        (f) => ({
          key: String(f.key),
          label: String(f.label ?? f.key),
        })
      );
    }

    if (typeof limit_schema === "object" && limit_schema !== null) {
      return Object.keys(limit_schema as Record<string, unknown>).map((k) => ({
        key: k,
        label: String((limit_schema as Record<string, unknown>)[k] ?? k),
      }));
    }
  } catch {
    return [];
  }

  return [];
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "draft").toLowerCase();

  const cls =
    normalized === "approved" || normalized === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalized === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : normalized === "rejected" || normalized === "expired"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${cls}`}
    >
      {status || "draft"}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-[#4B5563]">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-[#111827]">
        {value || "—"}
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error);
  const code = String(normalized.code || "").toLowerCase();
  const message = String(normalized.message || "").toLowerCase();

  if (code.includes("not_logged_in") || message.includes("not authenticated")) {
    return "Your session has expired. Please log in again.";
  }

  if (code.includes("permission") || message.includes("access denied")) {
    return "You do not have access to this COI workspace.";
  }

  return fallback;
}

export default function ContractorCOIPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);

  const [coi, setCoi] = useState<COIRow | null>(null);

  const [issueDate, setIssueDate] = useState<string>(todayISO());
  const [expDate, setExpDate] = useState<string>("");
  const [carrierName, setCarrierName] = useState<string>("");
  const [amBest, setAmBest] = useState<string>("");
  const [admitted, setAdmitted] = useState<boolean>(false);

  const [insuredName, setInsuredName] = useState<string>("");
  const [brokerName, setBrokerName] = useState<string>("");
  const [brokerPhone, setBrokerPhone] = useState<string>("");
  const [brokerEmail, setBrokerEmail] = useState<string>("");
  const [certificateHolder, setCertificateHolder] = useState<string>("");
  const [operationsDescription, setOperationsDescription] = useState<string>("");
  const [additionalInsuredText, setAdditionalInsuredText] =
    useState<string>("");
  const [waiverText, setWaiverText] = useState<string>("");
  const [primaryNonContribText, setPrimaryNonContribText] =
    useState<string>("");
  const [includedEntitiesText, setIncludedEntitiesText] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<FileList | null>(null);

  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceTypeRow[]>([]);
  const [endorsementTypes, setEndorsementTypes] = useState<EndorsementTypeRow[]>(
    []
  );

  const [policies, setPolicies] = useState<COIPolicyRow[]>([]);
  const [endorsementCodes, setEndorsementCodes] = useState<string[]>([]);
  const [noticeDays, setNoticeDays] = useState<number>(30);

  const [supportingFileRows, setSupportingFileRows] = useState<
    COISupportingFileRow[]
  >([]);
  const [historyRows, setHistoryRows] = useState<COIHistoryRow[]>([]);

  const [selectedInsuranceTypeId, setSelectedInsuranceTypeId] =
    useState<string>("");
  const [policyIssue, setPolicyIssue] = useState<string>(todayISO());
  const [policyExp, setPolicyExp] = useState<string>("");
  const [policyNumber, setPolicyNumber] = useState<string>("");
  const [limits, setLimits] = useState<Record<string, string>>({});

  const selectedInsuranceType = useMemo(
    () => insuranceTypes.find((x) => x.id === selectedInsuranceTypeId) || null,
    [insuranceTypes, selectedInsuranceTypeId]
  );

  const limitFields = useMemo(() => {
    return parseLimitSchemaKeys(selectedInsuranceType?.limit_schema);
  }, [selectedInsuranceType]);

  const insuranceNameById = useMemo(() => {
    const m: Record<string, string> = {};
    insuranceTypes.forEach((x) => {
      m[x.id] = x.name;
    });
    return m;
  }, [insuranceTypes]);

  async function uploadCurrentCOI(company_id: string): Promise<string | null> {
    if (!file) return null;

    const sessionResult = await withErrorLogging(
      async () => {
        const result = await supabase.auth.getSession();

        if (result.error) {
          throw result.error;
        }

        return result;
      },
      {
        message: "contractor_coi_get_session_failed",
        code: "contractor_coi_get_session_failed",
        source: "frontend",
        area: "documents",
        path: "/contractor/coi",
        details: {
          companyId: company_id,
        },
      }
    );

    const accessToken = sessionResult.data.session?.access_token;
    if (!accessToken) {
      throw new Error("No session token. Please login again.");
    }

    const json = await withErrorLogging(
      async () => {
        const res = await fetch("/api/coi/signed-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            companyId: company_id,
            filename: file.name,
            contentType: file.type || "application/pdf",
          }),
        });

        const body = await res.json();

        if (!res.ok) {
          throw new Error(body?.error || "Failed to create signed upload");
        }

        return body as { path: string; token: string };
      },
      {
        message: "contractor_coi_create_signed_upload_failed",
        code: "contractor_coi_create_signed_upload_failed",
        source: "frontend",
        area: "documents",
        path: "/contractor/coi",
        details: {
          companyId: company_id,
          fileName: file.name,
        },
      }
    );

    const bucketName = "coi-files";

    await withErrorLogging(
      async () => {
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .uploadToSignedUrl(json.path, json.token, file, {
            contentType: file.type || "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }
      },
      {
        message: "contractor_coi_upload_file_failed",
        code: "contractor_coi_upload_file_failed",
        source: "frontend",
        area: "documents",
        path: "/contractor/coi",
        details: {
          companyId: company_id,
          fileName: file.name,
        },
      }
    );

    return json.path;
  }

  async function uploadSupportingFiles(currentCoiId: string, company_id: string) {
    if (!supportingFiles || supportingFiles.length === 0) return;

    const sessionResult = await withErrorLogging(
      async () => {
        const result = await supabase.auth.getSession();

        if (result.error) {
          throw result.error;
        }

        return result;
      },
      {
        message: "contractor_coi_get_supporting_session_failed",
        code: "contractor_coi_get_supporting_session_failed",
        source: "frontend",
        area: "documents",
        path: "/contractor/coi",
        details: {
          companyId: company_id,
          coiId: currentCoiId,
        },
      }
    );

    const userId = sessionResult.data.session?.user?.id || null;

    for (const f of Array.from(supportingFiles)) {
      const ext = f.name.includes(".") ? f.name.split(".").pop() : "bin";
      const path = `${company_id}/${currentCoiId}/supporting/${crypto.randomUUID()}.${ext}`;

      await withErrorLogging(
        async () => {
          const { error: uploadError } = await supabase.storage
            .from("coi-files")
            .upload(path, f, { upsert: false });

          if (uploadError) {
            throw uploadError;
          }
        },
        {
          message: "contractor_coi_upload_supporting_file_failed",
          code: "contractor_coi_upload_supporting_file_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            companyId: company_id,
            coiId: currentCoiId,
            fileName: f.name,
          },
        }
      );

      await withErrorLogging(
        () =>
          addCOISupportingFile({
            coi_id: currentCoiId,
            uploaded_by: userId,
            file_name: f.name,
            file_path: path,
          }),
        {
          message: "contractor_coi_save_supporting_file_failed",
          code: "contractor_coi_save_supporting_file_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            companyId: company_id,
            coiId: currentCoiId,
            fileName: f.name,
          },
        }
      );
    }
  }

  async function load() {
    setLoading(true);
    setErr(null);
    setOk(null);

    try {
      const profile = await withErrorLogging(
        () => getMyProfile(),
        {
          message: "contractor_coi_load_profile_failed",
          code: "contractor_coi_load_profile_failed",
          source: "frontend",
          area: "auth",
          path: "/contractor/coi",
        }
      );

      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const myCompany = await withErrorLogging(
        () => getMyCompany(),
        {
          message: "contractor_coi_load_company_failed",
          code: "contractor_coi_load_company_failed",
          source: "frontend",
          area: "contractor",
          path: "/contractor/coi",
        }
      );

      if (!myCompany) {
        setErr("Create your company first in Contractor portal.");
        setLoading(false);
        return;
      }

      setCompanyId(myCompany.id);

      const [it, et, coi0] = await Promise.all([
        withErrorLogging(() => listInsuranceTypes(), {
          message: "contractor_coi_list_insurance_types_failed",
          code: "contractor_coi_list_insurance_types_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
        }),
        withErrorLogging(() => listEndorsementTypes(), {
          message: "contractor_coi_list_endorsement_types_failed",
          code: "contractor_coi_list_endorsement_types_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
        }),
        withErrorLogging(() => getMyCOI(myCompany.id), {
          message: "contractor_coi_get_current_failed",
          code: "contractor_coi_get_current_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            companyId: myCompany.id,
          },
        }),
      ]);

      setInsuranceTypes(it);
      setEndorsementTypes(et);

      if (coi0) {
        setCoi(coi0);

        setIssueDate(coi0.issue_date ?? todayISO());
        setExpDate(coi0.expiration_date ?? "");
        setCarrierName(coi0.carrier_name ?? "");
        setAmBest(coi0.am_best_rating ?? "");
        setAdmitted(!!coi0.admitted_carrier);

        setInsuredName(coi0.insured_name ?? "");
        setBrokerName(coi0.broker_name ?? "");
        setBrokerPhone(coi0.broker_phone ?? "");
        setBrokerEmail(coi0.broker_email ?? "");
        setCertificateHolder(coi0.certificate_holder ?? "");
        setOperationsDescription(coi0.description_of_operations ?? "");
        setAdditionalInsuredText(coi0.additional_insured_text ?? "");
        setWaiverText(coi0.waiver_of_subrogation_text ?? "");
        setPrimaryNonContribText(coi0.primary_non_contributory_text ?? "");
        setIncludedEntitiesText(coi0.included_entities_text ?? "");

        const [p, e, supportingRows, history] = await Promise.all([
          withErrorLogging(() => listCOIPolicies(coi0.id), {
            message: "contractor_coi_list_policies_failed",
            code: "contractor_coi_list_policies_failed",
            source: "frontend",
            area: "documents",
            path: "/contractor/coi",
            details: {
              coiId: coi0.id,
            },
          }),
          withErrorLogging(() => listCOIEndorsements(coi0.id), {
            message: "contractor_coi_list_endorsements_failed",
            code: "contractor_coi_list_endorsements_failed",
            source: "frontend",
            area: "documents",
            path: "/contractor/coi",
            details: {
              coiId: coi0.id,
            },
          }),
          withErrorLogging(() => listCOISupportingFiles(coi0.id), {
            message: "contractor_coi_list_supporting_files_failed",
            code: "contractor_coi_list_supporting_files_failed",
            source: "frontend",
            area: "documents",
            path: "/contractor/coi",
            details: {
              coiId: coi0.id,
            },
          }),
          withErrorLogging(() => listCOIHistory(myCompany.id), {
            message: "contractor_coi_list_history_failed",
            code: "contractor_coi_list_history_failed",
            source: "frontend",
            area: "documents",
            path: "/contractor/coi",
            details: {
              companyId: myCompany.id,
            },
          }),
        ]);

        setPolicies(p);
        setEndorsementCodes(e.codes);
        setNoticeDays(e.noticeDays ?? 30);
        setSupportingFileRows(supportingRows);
        setHistoryRows(history);
      } else {
        setCoi(null);
        setPolicies([]);
        setEndorsementCodes([]);
        setNoticeDays(30);
        setSupportingFileRows([]);
        setHistoryRows([]);
      }
    } catch (error) {
      setErr(
        getSafeErrorMessage(error, "Unable to load the COI workspace. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleEndorsement(code: string, checked: boolean) {
    setEndorsementCodes((prev) => {
      if (checked) return prev.includes(code) ? prev : [...prev, code];
      return prev.filter((x) => x !== code);
    });
  }

  async function saveCOI() {
    if (!companyId) return;

    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      const filePath = await uploadCurrentCOI(companyId);

      const saved = await withErrorLogging(
        () =>
          createOrUpdateMyCOI({
            company_id: companyId,
            issue_date: issueDate || null,
            expiration_date: expDate || null,
            carrier_name: carrierName || null,
            am_best_rating: amBest || null,
            admitted_carrier: admitted,
            file_path: filePath ?? coi?.file_path ?? null,
            insured_name: insuredName || null,
            broker_name: brokerName || null,
            broker_phone: brokerPhone || null,
            broker_email: brokerEmail || null,
            certificate_holder: certificateHolder || null,
            description_of_operations: operationsDescription || null,
            additional_insured_text: additionalInsuredText || null,
            waiver_of_subrogation_text: waiverText || null,
            primary_non_contributory_text: primaryNonContribText || null,
            included_entities_text: includedEntitiesText || null,
          }),
        {
          message: "contractor_coi_save_failed",
          code: "contractor_coi_save_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            companyId,
          },
        }
      );

      setCoi(saved);

      await withErrorLogging(
        () => saveCOIEndorsements(saved.id, endorsementCodes, noticeDays),
        {
          message: "contractor_coi_save_endorsements_failed",
          code: "contractor_coi_save_endorsements_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            coiId: saved.id,
          },
        }
      );

      const [p, e] = await Promise.all([
        withErrorLogging(() => listCOIPolicies(saved.id), {
          message: "contractor_coi_reload_policies_failed",
          code: "contractor_coi_reload_policies_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            coiId: saved.id,
          },
        }),
        withErrorLogging(() => listCOIEndorsements(saved.id), {
          message: "contractor_coi_reload_endorsements_failed",
          code: "contractor_coi_reload_endorsements_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            coiId: saved.id,
          },
        }),
      ]);

      setPolicies(p);
      setEndorsementCodes(e.codes);
      setNoticeDays(e.noticeDays ?? 30);

      await uploadSupportingFiles(saved.id, companyId);

      const [supportingRows, history] = await Promise.all([
        withErrorLogging(() => listCOISupportingFiles(saved.id), {
          message: "contractor_coi_reload_supporting_files_failed",
          code: "contractor_coi_reload_supporting_files_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            coiId: saved.id,
          },
        }),
        withErrorLogging(() => listCOIHistory(companyId), {
          message: "contractor_coi_reload_history_failed",
          code: "contractor_coi_reload_history_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            companyId,
          },
        }),
      ]);

      setSupportingFileRows(supportingRows);
      setHistoryRows(history);

      setOk("COI saved successfully.");
      setFile(null);
      setSupportingFiles(null);
    } catch (error) {
      setErr(getSafeErrorMessage(error, "Unable to save COI. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  async function downloadCOI() {
    if (!coi?.id) return;

    setErr(null);

    try {
      const sessionResult = await withErrorLogging(
        async () => {
          const result = await supabase.auth.getSession();

          if (result.error) {
            throw result.error;
          }

          return result;
        },
        {
          message: "contractor_coi_download_session_failed",
          code: "contractor_coi_download_session_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            coiId: coi.id,
          },
        }
      );

      const accessToken = sessionResult.data.session?.access_token;
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const json = await withErrorLogging(
        async () => {
          const res = await fetch(
            `/api/coi/signed-url?coiId=${encodeURIComponent(coi.id)}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          const body = await res.json();

          if (!res.ok) {
            throw new Error(body?.error || "Failed to get signed URL");
          }

          return body as { url: string };
        },
        {
          message: "contractor_coi_download_url_failed",
          code: "contractor_coi_download_url_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            coiId: coi.id,
          },
        }
      );

      window.open(json.url, "_blank");
    } catch (error) {
      setErr(
        getSafeErrorMessage(error, "Unable to download the current COI.")
      );
    }
  }

  async function addPolicy() {
    if (!coi?.id) {
      setErr("Save COI first.");
      return;
    }

    if (!selectedInsuranceTypeId) {
      setErr("Select insurance type.");
      return;
    }

    if (!policyExp) {
      setErr("Policy expiration date is required.");
      return;
    }

    setErr(null);

    try {
      const limitsJson: Record<string, unknown> = {};

      Object.entries(limits).forEach(([k, v]) => {
        const num = v.replace(/[^0-9]/g, "");
        limitsJson[k] = num ? Number(num) : v;
      });

      await withErrorLogging(
        () =>
          upsertCOIPolicy({
            coi_id: coi.id,
            insurance_type_id: selectedInsuranceTypeId,
            issue_date: policyIssue || null,
            expiration_date: policyExp || null,
            policy_number: policyNumber || null,
            limits: limitsJson,
          }),
        {
          message: "contractor_coi_add_policy_failed",
          code: "contractor_coi_add_policy_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            coiId: coi.id,
            insuranceTypeId: selectedInsuranceTypeId,
          },
        }
      );

      const p = await withErrorLogging(() => listCOIPolicies(coi.id), {
        message: "contractor_coi_reload_policies_after_add_failed",
        code: "contractor_coi_reload_policies_after_add_failed",
        source: "frontend",
        area: "documents",
        path: "/contractor/coi",
        details: {
          coiId: coi.id,
        },
      });

      setPolicies(p);
      setSelectedInsuranceTypeId("");
      setPolicyIssue(todayISO());
      setPolicyExp("");
      setPolicyNumber("");
      setLimits({});
    } catch (error) {
      setErr(getSafeErrorMessage(error, "Unable to add policy."));
    }
  }

  async function removePolicy(id: string) {
    if (!coi?.id) return;

    setErr(null);

    try {
      await withErrorLogging(
        () => deleteCOIPolicy(id),
        {
          message: "contractor_coi_delete_policy_failed",
          code: "contractor_coi_delete_policy_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/coi",
          details: {
            coiId: coi.id,
            policyId: id,
          },
        }
      );

      const p = await withErrorLogging(() => listCOIPolicies(coi.id), {
        message: "contractor_coi_reload_policies_after_delete_failed",
        code: "contractor_coi_reload_policies_after_delete_failed",
        source: "frontend",
        area: "documents",
        path: "/contractor/coi",
        details: {
          coiId: coi.id,
        },
      });

      setPolicies(p);
    } catch (error) {
      setErr(getSafeErrorMessage(error, "Unable to delete policy."));
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Certificate of Insurance
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Upload and manage the current COI, structured policy information,
              endorsements, and compliance details. Only one current COI should
              be active at a time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={coi?.status ?? "draft"} />

            <Link
              href="/contractor"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to overview
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <SectionCard title="Loading">
          <p className="text-sm text-[#4B5563]">Loading COI workspace...</p>
        </SectionCard>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {ok ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
          {ok}
        </section>
      ) : null}

      <SectionCard
        title="Current COI file"
        subtitle="Upload the active COI file, replace it when needed, and keep the current certificate linked to this company."
      >
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Current COI file
              </label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Active file path
              </div>
              <div className="mt-1 break-all text-sm font-medium text-[#111827]">
                {coi?.file_path || "No active file uploaded"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={downloadCOI}
              disabled={!coi?.id}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Download current COI
            </button>

            <button
              type="button"
              onClick={() => void load()}
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Refresh data
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Certificate details"
        subtitle="Enter the core data shown on the certificate."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Issue date
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={iso(issueDate)}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Expiration date
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={iso(expDate)}
              onChange={(e) => setExpDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Insured company name
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={insuredName}
              onChange={(e) => setInsuredName(e.target.value)}
              placeholder="Named insured"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Certificate holder
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={certificateHolder}
              onChange={(e) => setCertificateHolder(e.target.value)}
              placeholder="Certificate holder"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Description of operations
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-2xl border border-[#D9E2EC] p-3 text-sm"
              value={operationsDescription}
              onChange={(e) => setOperationsDescription(e.target.value)}
              placeholder="Description of operations / locations / vehicles / project wording"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Broker / Agent"
        subtitle="Record the producer / broker details from the certificate."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Broker / agent name
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={brokerName}
              onChange={(e) => setBrokerName(e.target.value)}
              placeholder="Broker or agency name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Broker phone
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={brokerPhone}
              onChange={(e) => setBrokerPhone(e.target.value)}
              placeholder="Phone"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Broker email
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={brokerEmail}
              onChange={(e) => setBrokerEmail(e.target.value)}
              placeholder="Email"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Carrier details"
        subtitle="Store carrier information displayed on the COI."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Carrier name
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="e.g. Travelers"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              AM Best rating
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={amBest}
              onChange={(e) => setAmBest(e.target.value)}
              placeholder='e.g. "A-"'
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-[#D9E2EC] p-4 text-sm text-[#111827]">
            <input
              type="checkbox"
              checked={admitted}
              onChange={(e) => setAdmitted(e.target.checked)}
            />
            Admitted carrier
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Policies"
        subtitle="Add every policy shown on the certificate with dates, policy number, and limits."
      >
        <div className="space-y-4">
          {policies.length === 0 ? (
            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              No policies added yet.
            </div>
          ) : (
            policies.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#111827]">
                      {insuranceNameById[p.insurance_type_id] ?? "Insurance"}
                    </div>
                    <div className="mt-1 text-sm text-[#4B5563]">
                      Policy #{p.policy_number || "—"} · {p.issue_date || "—"} →{" "}
                      {p.expiration_date || "—"}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    onClick={() => void removePolicy(p.id)}
                  >
                    Delete
                  </button>
                </div>

                <pre className="mt-4 overflow-auto rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-xs text-[#111827]">
{JSON.stringify(p.limits ?? {}, null, 2)}
                </pre>
              </div>
            ))
          )}

          <div className="space-y-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-5">
            <div className="text-base font-semibold text-[#111827]">
              Add a policy
            </div>

            <select
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={selectedInsuranceTypeId}
              onChange={(e) => {
                setSelectedInsuranceTypeId(e.target.value);
                setLimits({});
              }}
            >
              <option value="">Select insurance type...</option>
              {insuranceTypes.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
            </select>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Issue date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                  value={iso(policyIssue)}
                  onChange={(e) => setPolicyIssue(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Expiration date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                  value={iso(policyExp)}
                  onChange={(e) => setPolicyExp(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Policy number
                </label>
                <input
                  className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="Policy number"
                />
              </div>
            </div>

            {selectedInsuranceTypeId ? (
              <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4">
                <div className="mb-3 text-sm font-semibold text-[#111827]">
                  Limits
                </div>

                {limitFields.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {limitFields.map((f) => (
                      <div key={f.key}>
                        <label className="mb-1 block text-sm font-medium text-[#111827]">
                          {f.label}
                        </label>
                        <input
                          className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                          value={limits[f.key] ?? ""}
                          onChange={(e) =>
                            setLimits((prev) => ({
                              ...prev,
                              [f.key]: e.target.value,
                            }))
                          }
                          placeholder="e.g. 1000000"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-[#4B5563]">
                    <p>No limit schema found for this insurance type.</p>

                    <input
                      className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                      placeholder="Type a limit key and tab away"
                      onBlur={(e) => {
                        const k = e.target.value.trim();
                        if (!k) return;
                        setLimits((prev) => ({ ...prev, [k]: prev[k] ?? "" }));
                        e.target.value = "";
                      }}
                    />

                    {Object.keys(limits).length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {Object.keys(limits).map((k) => (
                          <div key={k}>
                            <label className="mb-1 block text-sm font-medium text-[#111827]">
                              {k}
                            </label>
                            <input
                              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
                              value={limits[k] ?? ""}
                              onChange={(e) =>
                                setLimits((prev) => ({
                                  ...prev,
                                  [k]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            <button
              type="button"
              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
              onClick={() => void addPolicy()}
            >
              Add policy
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Endorsements and additional wording"
        subtitle="Track standard COI endorsements and custom wording used for compliance."
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            {endorsementTypes.map((e) => (
              <label
                key={e.code}
                className="flex items-center gap-3 rounded-xl border border-[#D9E2EC] p-4 text-sm text-[#111827]"
              >
                <input
                  type="checkbox"
                  checked={endorsementCodes.includes(e.code)}
                  onChange={(ev) => toggleEndorsement(e.code, ev.target.checked)}
                />
                {e.name}
              </label>
            ))}
          </div>

          <div className="max-w-sm">
            <label className="mb-1 block text-sm font-medium text-[#111827]">
              Notice of cancellation (days)
            </label>
            <input
              className="w-full rounded-xl border border-[#D9E2EC] p-3 text-sm"
              value={noticeDays}
              onChange={(e) => setNoticeDays(Number(e.target.value || "0"))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Additional insured wording
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-[#D9E2EC] p-3 text-sm"
                value={additionalInsuredText}
                onChange={(e) => setAdditionalInsuredText(e.target.value)}
                placeholder="Additional insured wording"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Waiver of subrogation wording
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-[#D9E2EC] p-3 text-sm"
                value={waiverText}
                onChange={(e) => setWaiverText(e.target.value)}
                placeholder="Waiver of subrogation wording"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#111827]">
                Primary & non-contributory wording
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-[#D9E2EC] p-3 text-sm"
                value={primaryNonContribText}
                onChange={(e) => setPrimaryNonContribText(e.target.value)}
                placeholder="Primary and non-contributory wording"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Included entities"
        subtitle="List subsidiaries, additional named insureds, or other included entities tied to this certificate."
      >
        <textarea
          className="min-h-[140px] w-full rounded-2xl border border-[#D9E2EC] p-3 text-sm"
          value={includedEntitiesText}
          onChange={(e) => setIncludedEntitiesText(e.target.value)}
          placeholder="List included entities, one per line or as free-form text"
        />
      </SectionCard>

      <SectionCard
        title="Supporting attachments"
        subtitle="Attach supporting files related to the COI package."
      >
        <input
          type="file"
          multiple
          onChange={(e) => setSupportingFiles(e.target.files)}
          className="block w-full text-sm"
        />

        <p className="mt-2 text-sm text-[#4B5563]">
          Supporting attachments upload on save.
        </p>

        <div className="mt-4 space-y-3">
          {supportingFileRows.length === 0 ? (
            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              No supporting files uploaded yet.
            </div>
          ) : (
            supportingFileRows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4"
              >
                <div className="text-sm font-medium text-[#111827]">
                  {row.file_name || row.file_path}
                </div>
                <div className="mt-1 break-all text-xs text-[#6B7280]">
                  {row.file_path}
                </div>
                <div className="mt-1 text-xs text-[#6B7280]">
                  Uploaded: {formatDate(row.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Read-only compliance summary"
        subtitle="Use this block as a review summary before saving or sending for compliance verification."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Current status" value={coi?.status || "draft"} />
          <Field label="Issue date" value={issueDate} />
          <Field label="Expiration date" value={expDate} />
          <Field label="Insured company" value={insuredName} />
          <Field label="Carrier" value={carrierName} />
          <Field label="AM Best" value={amBest} />
          <Field label="Certificate holder" value={certificateHolder} />
          <Field label="Broker / agent" value={brokerName} />
          <Field label="Broker phone" value={brokerPhone} />
          <Field label="Broker email" value={brokerEmail} />
          <Field label="Policies count" value={String(policies.length)} />
          <Field
            label="Endorsements selected"
            value={endorsementCodes.length ? endorsementCodes.join(", ") : "—"}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Operations description" value={operationsDescription} />
          <Field label="Included entities" value={includedEntitiesText} />
          <Field label="Additional insured" value={additionalInsuredText} />
          <Field label="Waiver of subrogation" value={waiverText} />
          <Field
            label="Primary & non-contributory"
            value={primaryNonContribText}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="COI history"
        subtitle="Previous COI versions are archived automatically when the current COI is updated."
      >
        <div className="space-y-3">
          {historyRows.length === 0 ? (
            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              No archived COI versions yet.
            </div>
          ) : (
            historyRows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Version" value={String(row.version_no)} />
                  <Field label="Carrier" value={row.carrier_name} />
                  <Field label="Issue date" value={row.issue_date} />
                  <Field label="Expiration date" value={row.expiration_date} />
                  <Field label="Archived at" value={formatDate(row.archived_at)} />
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveCOI()}
          disabled={saving || loading}
          className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save COI"}
        </button>

        <button
          type="button"
          onClick={() => void load()}
          disabled={saving}
          className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh
        </button>
      </div>
    </main>
  );
}