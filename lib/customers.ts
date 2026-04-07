import { supabase } from "./supabaseClient";
import { getMyUserId } from "./auth";

export type Customer = {
  id: string;
  owner_user_id: string;
  name: string | null;
  description: string | null;
};

type AppError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

function createAppError(
  message: string,
  code: string,
  details?: Record<string, unknown>
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.details = details;
  return error;
}

function normalizeCustomerError(error: any, context: string): AppError {
  const rawMessage =
    error?.message ||
    error?.error_description ||
    error?.details ||
    "Unknown customer error";

  const dbCode = String(error?.code || "").toLowerCase();
  const message = String(rawMessage).toLowerCase();

  if (
    dbCode === "23505" ||
    message.includes("duplicate key") ||
    message.includes("customers_owner_user_id") ||
    message.includes("unique")
  ) {
    return createAppError(
      "Customer organization already exists.",
      `${context}_duplicate`,
      {
        rawMessage,
        dbCode: error?.code ?? null,
        hint: error?.hint ?? null,
        details: error?.details ?? null,
      }
    );
  }

  return createAppError(rawMessage, `${context}_failed`, {
    rawMessage,
    dbCode: error?.code ?? null,
    hint: error?.hint ?? null,
    details: error?.details ?? null,
  });
}

export async function getMyCustomer(): Promise<Customer | null> {
  const uid = await getMyUserId();

  const { data, error } = await supabase
    .from("customers")
    .select("id, owner_user_id, name, description")
    .eq("owner_user_id", uid)
    .maybeSingle();

  if (error) throw normalizeCustomerError(error, "get_my_customer");
  return (data || null) as Customer | null;
}

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
  const userId = await getMyUserId();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) throw normalizeCustomerError(error, "get_my_customer_org");
  return (data ?? null) as CustomerOrg | null;
}

export async function createMyCustomerOrg(params: {
  name: string;
  description?: string;
}) {
  const userId = await getMyUserId();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      owner_user_id: userId,
      name: params.name,
      description: params.description || null,
    })
    .select("*")
    .single();

  if (error) throw normalizeCustomerError(error, "create_my_customer_org");
  return data as CustomerOrg;
}

export async function listScopes(): Promise<Scope[]> {
  const { data, error } = await supabase
    .from("scopes")
    .select("*")
    .order("name");

  if (error) throw normalizeCustomerError(error, "list_scopes");
  return (data || []) as Scope[];
}

export async function listCustomerInsuranceReq(
  customerId: string
): Promise<CustomerInsuranceRequirement[]> {
  const { data, error } = await supabase
    .from("customer_insurance_requirements")
    .select("*")
    .eq("customer_id", customerId);

  if (error) {
    throw normalizeCustomerError(error, "list_customer_insurance_requirements");
  }

  return (data || []) as CustomerInsuranceRequirement[];
}

export async function upsertCustomerInsuranceReq(
  row: Omit<CustomerInsuranceRequirement, "id"> & { id?: string }
) {
  const payload: any = { ...row };
  if (!row.id) delete payload.id;

  const { error } = await supabase
    .from("customer_insurance_requirements")
    .upsert(payload, { onConflict: "customer_id,insurance_type_id" });

  if (error) {
    throw normalizeCustomerError(error, "upsert_customer_insurance_requirement");
  }
}

export async function listCustomerScopeReq(
  customerId: string
): Promise<CustomerScopeRequirement[]> {
  const { data, error } = await supabase
    .from("customer_scope_requirements")
    .select("*")
    .eq("customer_id", customerId);

  if (error) throw normalizeCustomerError(error, "list_customer_scope_requirements");
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

  if (error) throw normalizeCustomerError(error, "upsert_customer_scope_requirement");
}

export async function deleteCustomerScopeReq(
  customerId: string,
  scopeId: string,
  certTypeId: string
) {
  const { error } = await supabase
    .from("customer_scope_requirements")
    .delete()
    .eq("customer_id", customerId)
    .eq("scope_id", scopeId)
    .eq("cert_type_id", certTypeId);

  if (error) throw normalizeCustomerError(error, "delete_customer_scope_requirement");
}

export async function ensureMyCustomerOrg() {
  const existing = await getMyCustomerOrg();
  if (existing) return existing;

  try {
    return await createMyCustomerOrg({
      name: "My Customer Org",
      description: "",
    });
  } catch (error: any) {
    const code = String(error?.code || "");

    if (code === "create_my_customer_org_duplicate") {
      const retry = await getMyCustomerOrg();
      if (retry) return retry;
    }

    throw error;
  }
}

// ===== Approved contractors + COI =====

type ApprovedContractorRowDb = {
  contractor_company_id: string;
  status: string;
  created_at?: string;
  contractor_companies:
    | {
        id: string;
        legal_name: string;
        dba_name: string | null;
        status: string | null;
        block_reason: string | null;
      }
    | {
        id: string;
        legal_name: string;
        dba_name: string | null;
        status: string | null;
        block_reason: string | null;
      }[]
    | null;
};

export type ApprovedContractorRow = {
  contractor_company_id: string;
  status: string;
  created_at?: string;
  contractor_companies: {
    id: string;
    legal_name: string;
    dba_name: string | null;
    status: string | null;
    block_reason: string | null;
  } | null;
};

export type ContractorCoiRow = {
  id: string;
  company_id: string;
  status: string;
  file_path: string;
  created_at: string;
};

function normalizeApprovedContractors(
  rows: ApprovedContractorRowDb[]
): ApprovedContractorRow[] {
  return rows.map((row) => ({
    contractor_company_id: row.contractor_company_id,
    status: row.status,
    created_at: row.created_at,
    contractor_companies: Array.isArray(row.contractor_companies)
      ? row.contractor_companies[0] ?? null
      : row.contractor_companies,
  }));
}

export async function getMyCustomerId(): Promise<string> {
  const org = await ensureMyCustomerOrg();
  return org.id;
}

export async function listApprovedCustomerContractorsDetailed(): Promise<
  ApprovedContractorRow[]
> {
  const customerId = await getMyCustomerId();

  const { data, error } = await supabase
    .from("customer_contractors")
    .select(
      `
      contractor_company_id,
      status,
      created_at,
      contractor_companies:contractor_companies!customer_contractors_contractor_company_id_fkey (
        id,
        legal_name,
        dba_name,
        status,
        block_reason
      )
    `
    )
    .eq("customer_id", customerId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw normalizeCustomerError(error, "list_approved_customer_contractors");

  return normalizeApprovedContractors(
    (data || []) as ApprovedContractorRowDb[]
  );
}

export async function listApprovedContractors(): Promise<ApprovedContractorRow[]> {
  return listApprovedCustomerContractorsDetailed();
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

  if (error) throw normalizeCustomerError(error, "list_latest_approved_coi_by_companies");

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

export async function searchContractorCompanies(
  q: string
): Promise<ContractorCompanyMini[]> {
  const query = q.trim();
  if (!query) return [];

  const { data, error } = await supabase
    .from("contractor_companies")
    .select("id, legal_name, dba_name, status")
    .or(`legal_name.ilike.%${query}%,dba_name.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw normalizeCustomerError(error, "search_contractor_companies");
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

  if (error) throw normalizeCustomerError(error, "upsert_customer_contractor");
}

export async function updateCustomerContractorStatus(
  contractorCompanyId: string,
  status: "approved" | "pending" | "rejected"
) {
  const customerId = await getMyCustomerId();

  const { error } = await supabase
    .from("customer_contractors")
    .update({ status })
    .eq("customer_id", customerId)
    .eq("contractor_company_id", contractorCompanyId);

  if (error) throw normalizeCustomerError(error, "update_customer_contractor_status");
}

export async function removeCustomerContractor(contractorCompanyId: string) {
  const customerId = await getMyCustomerId();

  const { error } = await supabase
    .from("customer_contractors")
    .delete()
    .eq("customer_id", customerId)
    .eq("contractor_company_id", contractorCompanyId);

  if (error) throw normalizeCustomerError(error, "remove_customer_contractor");
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
      created_at,
      contractor_companies:contractor_companies!customer_contractors_contractor_company_id_fkey (
        id,
        legal_name,
        dba_name,
        status,
        block_reason
      )
    `
    )
    .eq("customer_id", customerId)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw normalizeCustomerError(error, "list_customer_contractors_by_status");

  return normalizeApprovedContractors(
    (data || []) as ApprovedContractorRowDb[]
  );
}

export type ContractorBadgeState = {
  portalVerified: boolean;
  onboardedWithYou: boolean;
  meetsYourRequirements: boolean;
};

export type ContractorBadgeMap = Record<string, ContractorBadgeState>;

export function buildCustomerContractorBadgeMap(params: {
  marketplaceCompanyIds: string[];
  approvedCompanyIds: string[];
  contractorInsuranceByCompanyId: Record<string, string[]>;
  requiredInsuranceNames: string[];
}): ContractorBadgeMap {
  const {
    marketplaceCompanyIds,
    approvedCompanyIds,
    contractorInsuranceByCompanyId,
    requiredInsuranceNames,
  } = params;

  const approvedSet = new Set(approvedCompanyIds);
  const result: ContractorBadgeMap = {};

  for (const companyId of marketplaceCompanyIds) {
    const insuranceSet = new Set(
      contractorInsuranceByCompanyId[companyId] || []
    );

    const meetsYourRequirements =
      requiredInsuranceNames.length === 0
        ? true
        : requiredInsuranceNames.every((name) => insuranceSet.has(name));

    result[companyId] = {
      portalVerified: true,
      onboardedWithYou: approvedSet.has(companyId),
      meetsYourRequirements,
    };
  }

  return result;
}

export async function listMyCustomerRequiredInsuranceNames(): Promise<string[]> {
  const customerId = await getMyCustomerId();

  const [requirements, insuranceTypes] = await Promise.all([
    listCustomerInsuranceReq(customerId),
    listInsuranceTypes(),
  ]);

  const insuranceNameById = new Map(
    insuranceTypes.map((item) => [item.id, item.name] as const)
  );

  return requirements
    .filter((row) => row.is_required)
    .map((row) => insuranceNameById.get(row.insurance_type_id))
    .filter((name): name is string => !!name);
}

export async function listMyApprovedContractorCompanyIds(): Promise<string[]> {
  const rows = await listApprovedCustomerContractorsDetailed();

  return rows
    .map((row) => row.contractor_companies?.id || row.contractor_company_id)
    .filter(Boolean);
}

export type InsuranceType = {
  id: string;
  code: string;
  name: string;
  is_core: boolean;
  limit_schema: any;
};

export type EndorsementType = {
  id: string;
  code: string;
  name: string;
};

export type CustomerInsuranceConfig = {
  customer_id: string;
  minimum_days_before_expiration: number;
  warning_days_before_expiration: number;
  hard_block_if_expired: boolean;
  notice_of_cancellation_days: number;
  minimum_am_best_rating: string | null;
  must_be_admitted_carrier: boolean;
  state_restrictions: string | null;
  bond_required: boolean;
  bid_bond: boolean;
  performance_bond: boolean;
  payment_bond: boolean;
  bond_amount_percent: number | null;
};

export async function listInsuranceTypes(): Promise<InsuranceType[]> {
  const { data, error } = await supabase
    .from("insurance_types")
    .select("id, code, name, is_core, limit_schema")
    .order("is_core", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw normalizeCustomerError(error, "list_insurance_types");
  return (data || []) as InsuranceType[];
}

export async function listEndorsementTypes(): Promise<EndorsementType[]> {
  const { data, error } = await supabase
    .from("endorsement_types")
    .select("id, code, name")
    .order("name", { ascending: true });

  if (error) throw normalizeCustomerError(error, "list_endorsement_types");
  return (data || []) as EndorsementType[];
}

export async function getCustomerInsuranceConfig(
  customerId: string
): Promise<CustomerInsuranceConfig | null> {
  const { data, error } = await supabase
    .from("customer_insurance_config")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw normalizeCustomerError(error, "get_customer_insurance_config");
  return (data ?? null) as CustomerInsuranceConfig | null;
}

export async function upsertCustomerInsuranceConfig(
  row: CustomerInsuranceConfig
) {
  const { error } = await supabase
    .from("customer_insurance_config")
    .upsert(row, { onConflict: "customer_id" });

  if (error) throw normalizeCustomerError(error, "upsert_customer_insurance_config");
}

export async function listCustomerRequiredEndorsements(
  customerId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("customer_required_endorsements")
    .select("endorsement_type_id")
    .eq("customer_id", customerId);

  if (error) throw normalizeCustomerError(error, "list_customer_required_endorsements");
  return (data || []).map((x: any) => x.endorsement_type_id as string);
}

export async function setCustomerRequiredEndorsements(
  customerId: string,
  endorsementTypeIds: string[]
) {
  const { error: delErr } = await supabase
    .from("customer_required_endorsements")
    .delete()
    .eq("customer_id", customerId);

  if (delErr) {
    throw normalizeCustomerError(delErr, "delete_customer_required_endorsements");
  }

  if (endorsementTypeIds.length === 0) return;

  const { error: insErr } = await supabase
    .from("customer_required_endorsements")
    .insert(
      endorsementTypeIds.map((id) => ({
        customer_id: customerId,
        endorsement_type_id: id,
      }))
    );

  if (insErr) {
    throw normalizeCustomerError(insErr, "insert_customer_required_endorsements");
  }
}