import { supabase } from "./supabaseClient";

export type CustomerOrg = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Scope = {
  id: string;
  name: "tower" | "civil" | "fiber" | string;
  description: string | null;
};

export type CustomerInsuranceRequirement = {
  id: string;
  customer_id: string;
  insurance_type_id: string;
  is_required: boolean;
  min_limit_each_occurrence: number | null;
  min_limit_aggregate: number | null;
  require_additional_insured: boolean;
  require_blanket_additional_insured: boolean;
  require_primary_noncontributory: boolean;
  require_waiver_subrogation: boolean;
  notes: string | null;
};

export type CustomerScopeRequirement = {
  id: string;
  customer_id: string;
  scope_id: string;
  cert_type_id: string;
  min_count_in_team: number;
  notes: string | null;
};

export async function getMyCustomerOrg(): Promise<CustomerOrg | null> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userData.user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("owner_user_id", userData.user.id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as CustomerOrg | null;
}

export async function createMyCustomerOrg(params: { name: string; description?: string }) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userData.user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("customers")
    .insert({
      owner_user_id: userData.user.id,
      name: params.name,
      description: params.description || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CustomerOrg;
}

export async function listScopes(): Promise<Scope[]> {
  const { data, error } = await supabase.from("scopes").select("*").order("name");
  if (error) throw error;
  return (data || []) as Scope[];
}

export async function listCustomerInsuranceReq(customerId: string): Promise<CustomerInsuranceRequirement[]> {
  const { data, error } = await supabase
    .from("customer_insurance_requirements")
    .select("*")
    .eq("customer_id", customerId);

  if (error) throw error;
  return (data || []) as CustomerInsuranceRequirement[];
}

export async function upsertCustomerInsuranceReq(row: Omit<CustomerInsuranceRequirement, "id"> & { id?: string }) {
  const payload: any = { ...row };
  if (!row.id) delete payload.id;

  const { error } = await supabase
    .from("customer_insurance_requirements")
    .upsert(payload, { onConflict: "customer_id,insurance_type_id" });

  if (error) throw error;
}

export async function listCustomerScopeReq(customerId: string): Promise<CustomerScopeRequirement[]> {
  const { data, error } = await supabase
    .from("customer_scope_requirements")
    .select("*")
    .eq("customer_id", customerId);

  if (error) throw error;
  return (data || []) as CustomerScopeRequirement[];
}

export async function upsertCustomerScopeReq(row: {
  customer_id: string;
  scope_id: string;
  cert_type_id: string;
  min_count_in_team: number;
  notes?: string | null;
}) {
  const { error } = await supabase
    .from("customer_scope_requirements")
    .upsert(
      {
        customer_id: row.customer_id,
        scope_id: row.scope_id,
        cert_type_id: row.cert_type_id,
        min_count_in_team: row.min_count_in_team,
        notes: row.notes ?? null,
      },
      { onConflict: "customer_id,scope_id,cert_type_id" }
    );

  if (error) throw error;
}

export async function deleteCustomerScopeReq(customerId: string, scopeId: string, certTypeId: string) {
  const { error } = await supabase
    .from("customer_scope_requirements")
    .delete()
    .eq("customer_id", customerId)
    .eq("scope_id", scopeId)
    .eq("cert_type_id", certTypeId);

  if (error) throw error;
}

export async function ensureMyCustomerOrg() {
  const existing = await getMyCustomerOrg();
  if (existing) return existing;

  // создаём с дефолтным названием (потом в settings поменяет)
  const o = await createMyCustomerOrg({
    name: "My Customer Org",
    description: "",
  });
  return o;
}

// ===== Approved contractors + COI =====

export type ApprovedContractorRow = {
  contractor_company_id: string;
  status: string;
  contractor_companies: {
    id: string;
    legal_name: string;
    dba_name: string | null;
  }[]; // <-- ВАЖНО: массив
};


export type ContractorCoiRow = {
  id: string;
  company_id: string;
  status: string;
  file_path: string;
  created_at: string;
};

export async function getMyCustomerId(): Promise<string> {
  const org = await ensureMyCustomerOrg();
  return org.id;
}

export async function listApprovedContractors(): Promise<ApprovedContractorRow[]> {
  const customerId = await getMyCustomerId();

  const { data, error } = await supabase
    .from("customer_contractors")
    .select(
      `
      contractor_company_id,
      status,
      contractor_companies:contractor_company_id (
        id,
        legal_name,
        dba_name
      )
    `
    )
    .eq("customer_id", customerId)
    .eq("status", "approved");

  if (error) throw error;
  return (data || []) as ApprovedContractorRow[];
}

export async function listLatestApprovedCoiByCompanies(
  companyIds: string[]
): Promise<Record<string, ContractorCoiRow | null>> {
  const map: Record<string, ContractorCoiRow | null> = {};
  companyIds.forEach((id) => (map[id] = null));
  if (companyIds.length === 0) return map;

  const { data, error } = await supabase
    .from("contractor_coi")
    .select("id, company_id, status, file_path, created_at")
    .in("company_id", companyIds)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;

  for (const row of (data || []) as ContractorCoiRow[]) {
    if (!map[row.company_id]) map[row.company_id] = row;
  }

  return map;
}

export type ContractorCompanyMini = {
  id: string;
  legal_name: string;
  dba_name: string | null;
  status: string;
};

export async function searchContractorCompanies(q: string): Promise<ContractorCompanyMini[]> {
  const query = q.trim();
  if (!query) return [];

  const { data, error } = await supabase
    .from("contractor_companies")
    .select("id, legal_name, dba_name, status")
    .or(`legal_name.ilike.%${query}%,dba_name.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []) as ContractorCompanyMini[];
}

export async function upsertCustomerContractor(params: {
  contractor_company_id: string;
  status: "approved" | "pending" | "rejected";
}) {
  const customerId = await getMyCustomerId();
  const { error } = await supabase
    .from("customer_contractors")
    .upsert(
      {
        customer_id: customerId,
        contractor_company_id: params.contractor_company_id,
        status: params.status,
      },
      { onConflict: "customer_id,contractor_company_id" }
    );
  if (error) throw error;
}

export async function updateCustomerContractorStatus(contractorCompanyId: string, status: "approved" | "pending" | "rejected") {
  const customerId = await getMyCustomerId();
  const { error } = await supabase
    .from("customer_contractors")
    .update({ status })
    .eq("customer_id", customerId)
    .eq("contractor_company_id", contractorCompanyId);

  if (error) throw error;
}

export async function removeCustomerContractor(contractorCompanyId: string) {
  const customerId = await getMyCustomerId();
  const { error } = await supabase
    .from("customer_contractors")
    .delete()
    .eq("customer_id", customerId)
    .eq("contractor_company_id", contractorCompanyId);

  if (error) throw error;
}

export async function listCustomerContractorsByStatus(
  status: "approved" | "pending" | "rejected"
): Promise<ApprovedContractorRow[]> {
  const customerId = await getMyCustomerId();

  const { data, error } = await supabase
    .from("customer_contractors")
    .select(
      `
      contractor_company_id,
      status,
      contractor_companies:contractor_company_id (
        id,
        legal_name,
        dba_name
      )
    `
    )
    .eq("customer_id", customerId)
    .eq("status", status);

  if (error) throw error;
  return (data || []) as ApprovedContractorRow[];
}
