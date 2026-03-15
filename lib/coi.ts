import { supabase } from "./supabaseClient";

export type COIRow = {
  id: string;
  company_id: string;
  issue_date: string | null;
  expiration_date: string | null;
  carrier_name: string | null;
  am_best_rating: string | null;
  admitted_carrier: boolean | null;
  file_path: string | null;
  status: string | null;
  review_notes: string | null;

  insured_name: string | null;
  broker_name: string | null;
  broker_phone: string | null;
  broker_email: string | null;
  certificate_holder: string | null;
  description_of_operations: string | null;
  additional_insured_text: string | null;
  waiver_of_subrogation_text: string | null;
  primary_non_contributory_text: string | null;
  included_entities_text: string | null;

  version_no: number;
  archived_at: string | null;
  created_at: string;
};

export type COIHistoryRow = {
  id: string;
  source_coi_id: string | null;
  company_id: string;
  issue_date: string | null;
  expiration_date: string | null;
  carrier_name: string | null;
  am_best_rating: string | null;
  admitted_carrier: boolean | null;
  file_path: string | null;
  status: string | null;
  review_notes: string | null;

  insured_name: string | null;
  broker_name: string | null;
  broker_phone: string | null;
  broker_email: string | null;
  certificate_holder: string | null;
  description_of_operations: string | null;
  additional_insured_text: string | null;
  waiver_of_subrogation_text: string | null;
  primary_non_contributory_text: string | null;
  included_entities_text: string | null;

  version_no: number;
  archived_at: string;
  created_at: string;
};

export type COISupportingFileRow = {
  id: string;
  coi_id: string;
  uploaded_by: string | null;
  file_name: string | null;
  file_path: string;
  created_at: string;
};

export type InsuranceTypeRow = {
  id: string;
  code: string | null;
  name: string;
  is_core: boolean | null;
  limit_schema: any;
  created_at?: string;
};

export type EndorsementTypeRow = {
  code: string;
  name: string;
};

export type COIPolicyRow = {
  id: string;
  coi_id: string;
  insurance_type_id: string;
  issue_date: string | null;
  expiration_date: string | null;
  policy_number: string | null;
  limits: any;
  created_at: string;
};

export async function listInsuranceTypes(): Promise<InsuranceTypeRow[]> {
  const { data, error } = await supabase
    .from("insurance_types")
    .select("id,code,name,is_core,limit_schema,created_at")
    .order("is_core", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as InsuranceTypeRow[];
}

export async function listEndorsementTypes(): Promise<EndorsementTypeRow[]> {
  const { data, error } = await supabase
    .from("endorsement_types")
    .select("code,name")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as EndorsementTypeRow[];
}

export async function getMyCOI(companyId: string): Promise<COIRow | null> {
  const { data, error } = await supabase
    .from("contractor_coi")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as COIRow | null;
}

export async function createOrUpdateMyCOI(input: {
  company_id: string;
  issue_date: string | null;
  expiration_date: string | null;
  carrier_name: string | null;
  am_best_rating: string | null;
  admitted_carrier: boolean;
  file_path: string | null;

  insured_name?: string | null;
  broker_name?: string | null;
  broker_phone?: string | null;
  broker_email?: string | null;
  certificate_holder?: string | null;
  description_of_operations?: string | null;
  additional_insured_text?: string | null;
  waiver_of_subrogation_text?: string | null;
  primary_non_contributory_text?: string | null;
  included_entities_text?: string | null;
}): Promise<COIRow> {
  const payload: any = {
    company_id: input.company_id,
    issue_date: input.issue_date,
    expiration_date: input.expiration_date,
    carrier_name: input.carrier_name,
    am_best_rating: input.am_best_rating,
    admitted_carrier: input.admitted_carrier,
    file_path: input.file_path,
    status: "pending",
    review_notes: null,

    insured_name: input.insured_name ?? null,
    broker_name: input.broker_name ?? null,
    broker_phone: input.broker_phone ?? null,
    broker_email: input.broker_email ?? null,
    certificate_holder: input.certificate_holder ?? null,
    description_of_operations: input.description_of_operations ?? null,
    additional_insured_text: input.additional_insured_text ?? null,
    waiver_of_subrogation_text: input.waiver_of_subrogation_text ?? null,
    primary_non_contributory_text: input.primary_non_contributory_text ?? null,
    included_entities_text: input.included_entities_text ?? null,
  };

  const { data, error } = await supabase
    .from("contractor_coi")
    .upsert(payload, { onConflict: "company_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as COIRow;
}

export async function listCOIPolicies(coiId: string): Promise<COIPolicyRow[]> {
  const { data, error } = await supabase
    .from("contractor_coi_policies")
    .select("*")
    .eq("coi_id", coiId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as COIPolicyRow[];
}

export async function upsertCOIPolicy(input: {
  coi_id: string;
  insurance_type_id: string;
  issue_date: string | null;
  expiration_date: string | null;
  policy_number: string | null;
  limits: any;
}) {
  const { error } = await supabase.from("contractor_coi_policies").insert({
    coi_id: input.coi_id,
    insurance_type_id: input.insurance_type_id,
    issue_date: input.issue_date,
    expiration_date: input.expiration_date,
    policy_number: input.policy_number,
    limits: input.limits ?? {},
  });

  if (error) throw error;
}

export async function deleteCOIPolicy(policyId: string) {
  const { error } = await supabase
    .from("contractor_coi_policies")
    .delete()
    .eq("id", policyId);

  if (error) throw error;
}

export async function listCOIEndorsements(
  coiId: string
): Promise<{ codes: string[]; noticeDays: number | null }> {
  const { data, error } = await supabase
    .from("contractor_coi_endorsements")
    .select("endorsement_code,notice_days")
    .eq("coi_id", coiId);

  if (error) throw error;

  const rows = (data || []) as any[];
  const codes = rows.map((r) => String(r.endorsement_code));
  const nd =
    rows.find((r) => typeof r.notice_days === "number")?.notice_days ?? null;

  return { codes, noticeDays: nd };
}

export async function saveCOIEndorsements(
  coiId: string,
  codes: string[],
  noticeDays: number
) {
  const { error: delErr } = await supabase
    .from("contractor_coi_endorsements")
    .delete()
    .eq("coi_id", coiId);

  if (delErr) throw delErr;

  if (!codes || codes.length === 0) return;

  const payload = codes.map((c) => ({
    coi_id: coiId,
    endorsement_code: c,
    notice_days: noticeDays ?? null,
  }));

  const { error: insErr } = await supabase
    .from("contractor_coi_endorsements")
    .insert(payload);

  if (insErr) throw insErr;
}

export async function listCOISupportingFiles(
  coiId: string
): Promise<COISupportingFileRow[]> {
  const { data, error } = await supabase
    .from("contractor_coi_supporting_files")
    .select("*")
    .eq("coi_id", coiId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as COISupportingFileRow[];
}

export async function addCOISupportingFile(input: {
  coi_id: string;
  uploaded_by?: string | null;
  file_name?: string | null;
  file_path: string;
}) {
  const { error } = await supabase
    .from("contractor_coi_supporting_files")
    .insert({
      coi_id: input.coi_id,
      uploaded_by: input.uploaded_by ?? null,
      file_name: input.file_name ?? null,
      file_path: input.file_path,
    });

  if (error) throw error;
}

export async function deleteCOISupportingFile(fileId: string) {
  const { error } = await supabase
    .from("contractor_coi_supporting_files")
    .delete()
    .eq("id", fileId);

  if (error) throw error;
}

export async function listCOIHistory(
  companyId: string
): Promise<COIHistoryRow[]> {
  const { data, error } = await supabase
    .from("contractor_coi_history")
    .select("*")
    .eq("company_id", companyId)
    .order("archived_at", { ascending: false });

  if (error) throw error;
  return (data || []) as COIHistoryRow[];
}