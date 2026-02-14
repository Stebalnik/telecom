import { supabase } from "./supabaseClient";

export type CertType = { id: string; name: string };
export type InsuranceType = { id: string; name: string };

export type DocumentRow = {
  id: string;
  doc_kind: "insurance" | "cert";
  company_id: string | null;
  team_member_id: string | null;
  cert_type_id: string | null;
  insurance_type_id: string | null;
  file_public_url: string;
  expires_at: string; // YYYY-MM-DD
  verification_status: "pending" | "approved" | "rejected";
  verification_note: string | null;
  created_at: string;
};

export async function listCertTypes(): Promise<CertType[]> {
  const { data, error } = await supabase.from("cert_types").select("id,name").order("name");
  if (error) throw error;
  return (data || []) as CertType[];
}

export async function listInsuranceTypes(): Promise<InsuranceType[]> {
  const { data, error } = await supabase.from("insurance_types").select("id,name").order("name");
  if (error) throw error;
  return (data || []) as InsuranceType[];
}

function safeFileName(original: string) {
  return original.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadToDocsBucket(file: File, folder: string) {
  const fileName = `${Date.now()}_${safeFileName(file.name)}`;
  const path = `${folder}/${fileName}`;

  const { error } = await supabase.storage.from("docs").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("docs").getPublicUrl(path);
  const publicUrl = data.publicUrl;

  return { path, publicUrl };
}

export async function createInsuranceDocument(params: {
  companyId: string;
  insuranceTypeId: string;
  expiresAt: string; // YYYY-MM-DD
  file: File;
}) {
  const { path, publicUrl } = await uploadToDocsBucket(params.file, `insurance/${params.companyId}`);

  const { error } = await supabase.from("documents").insert({
    doc_kind: "insurance",
    company_id: params.companyId,
    insurance_type_id: params.insuranceTypeId,
    file_path: path,
    file_public_url: publicUrl,
    expires_at: params.expiresAt,
  });

  if (error) throw error;
}

export async function createCertDocument(params: {
  memberId: string;
  certTypeId: string;
  expiresAt: string; // YYYY-MM-DD
  file: File;
}) {
  const { path, publicUrl } = await uploadToDocsBucket(params.file, `certs/${params.memberId}`);

  const { error } = await supabase.from("documents").insert({
    doc_kind: "cert",
    team_member_id: params.memberId,
    cert_type_id: params.certTypeId,
    file_path: path,
    file_public_url: publicUrl,
    expires_at: params.expiresAt,
  });

  if (error) throw error;
}

export async function listCompanyInsurance(companyId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("doc_kind", "insurance")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as DocumentRow[];
}

export async function listMemberCerts(memberId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("doc_kind", "cert")
    .eq("team_member_id", memberId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as DocumentRow[];
}
