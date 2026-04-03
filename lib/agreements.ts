import { supabase } from "./supabaseClient";
import { getMyUserId } from "./auth";

export type AgreementTemplateType =
  | "msa"
  | "service_agreement"
  | "one_time_project_agreement";

export type AgreementAppliesTo = "onboarding" | "per_job" | "both";

export type CustomerAgreementTemplate = {
  id: string;
  customer_id: string;
  template_type: AgreementTemplateType;
  title: string;
  description: string | null;
  file_name: string | null;
  file_path: string;
  applies_to: AgreementAppliesTo;
  is_default: boolean;
  status: "active" | "archived";
  created_by: string;
  created_at: string;
};

export type CustomerAgreement = {
  id: string;
  customer_id: string;
  contractor_company_id: string | null;
  job_id: string | null;
  template_id: string | null;
  agreement_type: AgreementTemplateType;
  title: string;
  file_name: string | null;
  file_path: string;
  status:
    | "draft"
    | "sent"
    | "awaiting_signature"
    | "signed"
    | "rejected"
    | "archived";
  source: "template" | "manual_upload";
  sent_at: string | null;
  signed_at: string | null;
  created_by: string;
  created_at: string;
  contractor:
    | {
        legal_name: string | null;
        dba_name: string | null;
      }
    | {
        legal_name: string | null;
        dba_name: string | null;
      }[]
    | null;
  job:
    | {
        title: string | null;
      }
    | {
        title: string | null;
      }[]
    | null;
};

export function agreementTypeLabel(value: AgreementTemplateType) {
  if (value === "msa") return "Master Service Agreement";
  if (value === "service_agreement") return "Service Agreement";
  return "One-time Project Agreement";
}

export function buildAgreementStoragePath(
  customerId: string,
  fileName: string
) {
  const safeName = fileName.replace(/\s+/g, "_");
  return `customer-agreements/${customerId}/${Date.now()}_${safeName}`;
}

export async function uploadAgreementFile(
  customerId: string,
  file: File
): Promise<{ filePath: string; fileName: string }> {
  const filePath = buildAgreementStoragePath(customerId, file.name);

  const { error } = await supabase.storage
    .from("agreement-files")
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) throw error;

  return {
    filePath,
    fileName: file.name,
  };
}

export async function getAgreementFileUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("agreement-files")
    .createSignedUrl(filePath, 60 * 30);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Could not create signed URL");

  return data.signedUrl;
}

export async function listCustomerAgreementTemplates(
  customerId: string
): Promise<CustomerAgreementTemplate[]> {
  const { data, error } = await supabase
    .from("customer_agreement_templates")
    .select(
      "id, customer_id, template_type, title, description, file_name, file_path, applies_to, is_default, status, created_by, created_at"
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as CustomerAgreementTemplate[];
}

export async function createCustomerAgreementTemplate(args: {
  customerId: string;
  templateType: AgreementTemplateType;
  title: string;
  description?: string;
  appliesTo: AgreementAppliesTo;
  isDefault?: boolean;
  file: File;
}) {
  const uid = await getMyUserId();
  const uploaded = await uploadAgreementFile(args.customerId, args.file);

  const { data, error } = await supabase
    .from("customer_agreement_templates")
    .insert({
      customer_id: args.customerId,
      template_type: args.templateType,
      title: args.title.trim(),
      description: args.description?.trim() || null,
      file_name: uploaded.fileName,
      file_path: uploaded.filePath,
      applies_to: args.appliesTo,
      is_default: !!args.isDefault,
      status: "active",
      created_by: uid,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (args.isDefault) {
    await setCustomerAgreementTemplateDefault(data.id);
  }

  return data as CustomerAgreementTemplate;
}

export async function setCustomerAgreementTemplateDefault(templateId: string) {
  const { error } = await supabase.rpc("set_customer_agreement_template_default", {
    p_template_id: templateId,
  });

  if (error) throw error;
}

export async function archiveCustomerAgreementTemplate(templateId: string) {
  const { error } = await supabase
    .from("customer_agreement_templates")
    .update({
      status: "archived",
      is_default: false,
    })
    .eq("id", templateId);

  if (error) throw error;
}

export async function listCustomerAgreements(
  customerId: string
): Promise<CustomerAgreement[]> {
  const { data, error } = await supabase
    .from("customer_agreements")
    .select(
      `
      id,
      customer_id,
      contractor_company_id,
      job_id,
      template_id,
      agreement_type,
      title,
      file_name,
      file_path,
      status,
      source,
      sent_at,
      signed_at,
      created_by,
      created_at,
      contractor:contractor_companies (
        legal_name,
        dba_name
      ),
      job:jobs (
        title
      )
    `
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as CustomerAgreement[];
}

export async function createAgreementFromTemplate(args: {
  templateId: string;
  contractorCompanyId?: string | null;
  jobId?: string | null;
  title?: string;
}) {
  const { data, error } = await supabase.rpc(
    "create_customer_agreement_from_template",
    {
      p_template_id: args.templateId,
      p_contractor_company_id: args.contractorCompanyId || null,
      p_job_id: args.jobId || null,
      p_title: args.title || null,
    }
  );

  if (error) throw error;
  return data as string;
}

export async function updateCustomerAgreementStatus(args: {
  agreementId: string;
  status:
    | "draft"
    | "sent"
    | "awaiting_signature"
    | "signed"
    | "rejected"
    | "archived";
}) {
  const patch: Record<string, string | null> = {
    status: args.status,
  };

  if (args.status === "sent" || args.status === "awaiting_signature") {
    patch.sent_at = new Date().toISOString();
  }

  if (args.status === "signed") {
    patch.signed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("customer_agreements")
    .update(patch)
    .eq("id", args.agreementId);

  if (error) throw error;
}

export async function createManualCustomerAgreement(args: {
  customerId: string;
  agreementType: AgreementTemplateType;
  title: string;
  contractorCompanyId?: string | null;
  jobId?: string | null;
  file: File;
}) {
  const uid = await getMyUserId();
  const uploaded = await uploadAgreementFile(args.customerId, args.file);

  const { data, error } = await supabase
    .from("customer_agreements")
    .insert({
      customer_id: args.customerId,
      contractor_company_id: args.contractorCompanyId || null,
      job_id: args.jobId || null,
      template_id: null,
      agreement_type: args.agreementType,
      title: args.title.trim(),
      file_name: uploaded.fileName,
      file_path: uploaded.filePath,
      status: "draft",
      source: "manual_upload",
      created_by: uid,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CustomerAgreement;
}