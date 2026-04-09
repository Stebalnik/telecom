import { getMyUserId } from "./auth";
import { normalizeError } from "./errors/normalizeError";
import {
  unwrapSupabase,
  unwrapSupabaseNullable,
} from "./errors/unwrapSupabase";
import { supabase } from "./supabaseClient";

export type CustomerOnboardingStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type CustomerStatus = "active" | "blocked" | string;

export type Customer = {
  id: string;
  owner_user_id: string;
  name: string;
  company_name: string;
  description: string | null;
  status: CustomerStatus;
  onboarding_status: CustomerOnboardingStatus;
  created_at: string;
  legal_name: string | null;
  dba_name: string | null;
  fein: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  project_contact_name: string | null;
  project_contact_title: string | null;
  project_contact_email: string | null;
  project_contact_phone: string | null;
  activation_notification_phone: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
};

export type CustomerOrg = Customer;

type AppError = Error & {
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
};

export type CustomerDraftInput = {
  name: string;
  company_name?: string;
  legal_name?: string | null;
  dba_name?: string | null;
  description?: string | null;
  fein?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  project_contact_name?: string | null;
  project_contact_title?: string | null;
  project_contact_email?: string | null;
  project_contact_phone?: string | null;
  activation_notification_phone?: string | null;
};

const CUSTOMER_SELECT = `
  id,
  owner_user_id,
  name,
  company_name,
  description,
  status,
  onboarding_status,
  created_at,
  legal_name,
  dba_name,
  fein,
  phone,
  email,
  address_line1,
  address_line2,
  city,
  state,
  zip,
  country,
  project_contact_name,
  project_contact_title,
  project_contact_email,
  project_contact_phone,
  activation_notification_phone,
  reviewed_at,
  reviewed_by,
  review_notes
`;

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

function normalizeCustomerError(
  error: unknown,
  context: string,
  fallbackMessage: string
): AppError {
  const normalized = normalizeError(error) as AppError;

  const rawMessage = normalized.message || fallbackMessage;
  const rawCode = String(normalized.code || "").toLowerCase();
  const message = String(rawMessage).toLowerCase();

  if (
    rawCode === "23505" ||
    message.includes("duplicate key") ||
    message.includes("customers_owner_user_id") ||
    message.includes("unique")
  ) {
    return createAppError(
      "Customer organization already exists.",
      `${context}_duplicate`,
      {
        rawMessage,
        originalCode: normalized.code ?? null,
        statusCode: normalized.statusCode ?? null,
        ...(normalized.details ?? {}),
      }
    );
  }

  return createAppError(rawMessage, `${context}_failed`, {
    rawMessage,
    originalCode: normalized.code ?? null,
    statusCode: normalized.statusCode ?? null,
    ...(normalized.details ?? {}),
  });
}

function trimOrNull(value?: string | null) {
  const next = value?.trim();
  return next ? next : null;
}

function buildCustomerDraftPayload(
  input: CustomerDraftInput,
  fallback?: Partial<CustomerOrg>
) {
  const nextName = trimOrNull(input.name) ?? trimOrNull(fallback?.name) ?? "";
  const nextCompanyName =
    trimOrNull(input.company_name) ??
    trimOrNull(input.name) ??
    trimOrNull(fallback?.company_name) ??
    trimOrNull(fallback?.name) ??
    "";

  return {
    name: nextName,
    company_name: nextCompanyName,
    legal_name: trimOrNull(input.legal_name) ?? trimOrNull(fallback?.legal_name),
    dba_name: trimOrNull(input.dba_name) ?? trimOrNull(fallback?.dba_name),
    description:
      input.description !== undefined
        ? trimOrNull(input.description)
        : trimOrNull(fallback?.description),
    fein: trimOrNull(input.fein) ?? trimOrNull(fallback?.fein),
    phone: trimOrNull(input.phone) ?? trimOrNull(fallback?.phone),
    email: trimOrNull(input.email) ?? trimOrNull(fallback?.email),
    address_line1:
      trimOrNull(input.address_line1) ?? trimOrNull(fallback?.address_line1),
    address_line2:
      trimOrNull(input.address_line2) ?? trimOrNull(fallback?.address_line2),
    city: trimOrNull(input.city) ?? trimOrNull(fallback?.city),
    state: trimOrNull(input.state) ?? trimOrNull(fallback?.state),
    zip: trimOrNull(input.zip) ?? trimOrNull(fallback?.zip),
    country:
      trimOrNull(input.country) ?? trimOrNull(fallback?.country) ?? "US",
    project_contact_name:
      trimOrNull(input.project_contact_name) ??
      trimOrNull(fallback?.project_contact_name),
    project_contact_title:
      trimOrNull(input.project_contact_title) ??
      trimOrNull(fallback?.project_contact_title),
    project_contact_email:
      trimOrNull(input.project_contact_email) ??
      trimOrNull(fallback?.project_contact_email),
    project_contact_phone:
      trimOrNull(input.project_contact_phone) ??
      trimOrNull(fallback?.project_contact_phone),
    activation_notification_phone:
      trimOrNull(input.activation_notification_phone) ??
      trimOrNull(fallback?.activation_notification_phone),
  };
}

export function isCustomerWorkspaceApproved(
  org: Pick<CustomerOrg, "onboarding_status"> | null | undefined
) {
  return org?.onboarding_status === "approved";
}

export function isCustomerOnboardingPending(
  org: Pick<CustomerOrg, "onboarding_status"> | null | undefined
) {
  return org?.onboarding_status === "submitted";
}

export function isCustomerOnboardingDraft(
  org: Pick<CustomerOrg, "onboarding_status"> | null | undefined
) {
  return (
    !org ||
    org.onboarding_status === "draft" ||
    org.onboarding_status === "rejected"
  );
}

export async function getMyCustomer(): Promise<Customer | null> {
  const uid = await getMyUserId();

  try {
    const data = unwrapSupabaseNullable(
      await supabase
        .from("customers")
        .select(CUSTOMER_SELECT)
        .eq("owner_user_id", uid)
        .maybeSingle(),
      "get_my_customer_failed"
    );

    return (data ?? null) as Customer | null;
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "get_my_customer",
      "Unable to load customer."
    );
  }
}

export async function getMyCustomerOrg(): Promise<CustomerOrg | null> {
  const userId = await getMyUserId();

  try {
    const data = unwrapSupabaseNullable(
      await supabase
        .from("customers")
        .select(CUSTOMER_SELECT)
        .eq("owner_user_id", userId)
        .maybeSingle(),
      "get_my_customer_org_failed"
    );

    return (data ?? null) as CustomerOrg | null;
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "get_my_customer_org",
      "Unable to load customer organization."
    );
  }
}

export async function createMyCustomerOrg(params: {
  name: string;
  description?: string;
}): Promise<CustomerOrg> {
  const userId = await getMyUserId();
  const safeName = params.name.trim();

  try {
    const data = unwrapSupabase<CustomerOrg>(
      await supabase
        .from("customers")
        .insert({
          owner_user_id: userId,
          name: safeName,
          company_name: safeName,
          description: params.description?.trim() || null,
          status: "active",
          onboarding_status: "draft",
          country: "US",
        })
        .select(CUSTOMER_SELECT)
        .single(),
      "create_my_customer_org_failed"
    );

    return data;
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "create_my_customer_org",
      "Unable to create customer organization."
    );
  }
}

export async function updateMyCustomerOrgDraft(
  params: CustomerDraftInput
): Promise<CustomerOrg> {
  const existing = await getMyCustomerOrg();

  if (!existing) {
    throw createAppError(
      "Customer organization not found.",
      "customer_org_not_found"
    );
  }

  const payload = buildCustomerDraftPayload(params, existing);

  if (!payload.name || !payload.company_name) {
    throw createAppError(
      "Customer company name is required.",
      "customer_org_name_required"
    );
  }

  try {
    const data = unwrapSupabase<CustomerOrg>(
      await supabase
        .from("customers")
        .update({
          ...payload,
          onboarding_status:
            existing.onboarding_status === "approved" ? "approved" : "draft",
        })
        .eq("id", existing.id)
        .select(CUSTOMER_SELECT)
        .single(),
      "update_my_customer_org_draft_failed"
    );

    return data;
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "update_my_customer_org_draft",
      "Unable to save customer organization."
    );
  }
}

export async function submitMyCustomerOrgForReview(
  params?: Partial<CustomerDraftInput>
): Promise<CustomerOrg> {
  const existing = await getMyCustomerOrg();

  if (!existing) {
    throw createAppError(
      "Customer organization not found.",
      "customer_org_not_found"
    );
  }

  const payload = buildCustomerDraftPayload(
    {
      name: params?.name ?? existing.name,
      company_name: params?.company_name ?? existing.company_name,
      legal_name: params?.legal_name ?? existing.legal_name,
      dba_name: params?.dba_name ?? existing.dba_name,
      description:
        params?.description !== undefined
          ? params.description
          : existing.description,
      fein: params?.fein ?? existing.fein,
      phone: params?.phone ?? existing.phone,
      email: params?.email ?? existing.email,
      address_line1: params?.address_line1 ?? existing.address_line1,
      address_line2: params?.address_line2 ?? existing.address_line2,
      city: params?.city ?? existing.city,
      state: params?.state ?? existing.state,
      zip: params?.zip ?? existing.zip,
      country: params?.country ?? existing.country,
      project_contact_name:
        params?.project_contact_name ?? existing.project_contact_name,
      project_contact_title:
        params?.project_contact_title ?? existing.project_contact_title,
      project_contact_email:
        params?.project_contact_email ?? existing.project_contact_email,
      project_contact_phone:
        params?.project_contact_phone ?? existing.project_contact_phone,
      activation_notification_phone:
        params?.activation_notification_phone ??
        existing.activation_notification_phone,
    },
    existing
  );

  if (!payload.name || !payload.company_name) {
    throw createAppError(
      "Customer company name is required.",
      "customer_org_name_required"
    );
  }

  try {
    const data = unwrapSupabase<CustomerOrg>(
      await supabase
        .from("customers")
        .update({
          ...payload,
          onboarding_status: "submitted",
          review_notes: null,
          reviewed_at: null,
          reviewed_by: null,
        })
        .eq("id", existing.id)
        .select(CUSTOMER_SELECT)
        .single(),
      "submit_my_customer_org_for_review_failed"
    );

    return data;
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "submit_my_customer_org_for_review",
      "Unable to submit customer organization."
    );
  }
}

export async function ensureMyCustomerOrg() {
  const existing = await getMyCustomerOrg();
  if (existing) return existing;

  try {
    return await createMyCustomerOrg({
      name: "My Customer Org",
      description: "",
    });
  } catch (error) {
    const normalized = normalizeError(error) as AppError;
    const code = String(normalized.code || "");

    if (code === "create_my_customer_org_duplicate") {
      const retry = await getMyCustomerOrg();
      if (retry) return retry;
    }

    throw error;
  }
}

export async function getMyCustomerId(): Promise<string> {
  const org = await getMyCustomerOrg();

  if (!org) {
    throw createAppError(
      "Customer organization not found.",
      "customer_org_not_found"
    );
  }

  return org.id;
}

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

export async function listScopes(): Promise<Scope[]> {
  try {
    const data = unwrapSupabase(
      await supabase.from("scopes").select("*").order("name"),
      "list_scopes_failed"
    );

    return (data || []) as Scope[];
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_scopes",
      "Unable to load scopes."
    );
  }
}

export async function listCustomerInsuranceReq(
  customerId: string
): Promise<CustomerInsuranceRequirement[]> {
  try {
    const data = unwrapSupabase(
      await supabase
        .from("customer_insurance_requirements")
        .select("*")
        .eq("customer_id", customerId),
      "list_customer_insurance_requirements_failed"
    );

    return (data || []) as CustomerInsuranceRequirement[];
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_customer_insurance_requirements",
      "Unable to load customer insurance requirements."
    );
  }
}

export async function upsertCustomerInsuranceReq(
  row: Omit<CustomerInsuranceRequirement, "id"> & { id?: string }
) {
  const payload: Omit<CustomerInsuranceRequirement, "id"> & { id?: string } = {
    ...row,
  };

  if (!row.id) delete payload.id;

  try {
    const result = await supabase
      .from("customer_insurance_requirements")
      .upsert(payload, { onConflict: "customer_id,insurance_type_id" });

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "upsert_customer_insurance_requirement",
      "Unable to save customer insurance requirement."
    );
  }
}

export async function listCustomerScopeReq(
  customerId: string
): Promise<CustomerScopeRequirement[]> {
  try {
    const data = unwrapSupabase(
      await supabase
        .from("customer_scope_requirements")
        .select("*")
        .eq("customer_id", customerId),
      "list_customer_scope_requirements_failed"
    );

    return (data || []) as CustomerScopeRequirement[];
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_customer_scope_requirements",
      "Unable to load customer scope requirements."
    );
  }
}

export async function upsertCustomerScopeReq(row: {
  customer_id: string;
  scope_id: string;
  cert_type_id: string;
  min_count_in_team: number;
  notes?: string | null;
}) {
  try {
    const result = await supabase.from("customer_scope_requirements").upsert(
      {
        customer_id: row.customer_id,
        scope_id: row.scope_id,
        cert_type_id: row.cert_type_id,
        min_count_in_team: row.min_count_in_team,
        notes: row.notes ?? null,
      },
      { onConflict: "customer_id,scope_id,cert_type_id" }
    );

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "upsert_customer_scope_requirement",
      "Unable to save customer scope requirement."
    );
  }
}

export async function deleteCustomerScopeReq(
  customerId: string,
  scopeId: string,
  certTypeId: string
) {
  try {
    const result = await supabase
      .from("customer_scope_requirements")
      .delete()
      .eq("customer_id", customerId)
      .eq("scope_id", scopeId)
      .eq("cert_type_id", certTypeId);

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "delete_customer_scope_requirement",
      "Unable to delete customer scope requirement."
    );
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

export async function listApprovedCustomerContractorsDetailed(): Promise<
  ApprovedContractorRow[]
> {
  const customerId = await getMyCustomerId();

  try {
    const data = unwrapSupabase(
      await supabase
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
        .order("created_at", { ascending: false }),
      "list_approved_customer_contractors_failed"
    );

    return normalizeApprovedContractors((data || []) as ApprovedContractorRowDb[]);
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_approved_customer_contractors",
      "Unable to load approved customer contractors."
    );
  }
}

export async function listApprovedContractors(): Promise<ApprovedContractorRow[]> {
  return listApprovedCustomerContractorsDetailed();
}

export async function listLatestApprovedCoiByCompanies(
  companyIds: string[]
): Promise<Record<string, ContractorCoiRow | null>> {
  const map: Record<string, ContractorCoiRow | null> = {};
  companyIds.forEach((id) => {
    map[id] = null;
  });

  if (companyIds.length === 0) return map;

  try {
    const data = unwrapSupabase(
      await supabase
        .from("contractor_coi")
        .select("id, company_id, status, file_path, created_at")
        .in("company_id", companyIds)
        .eq("status", "approved")
        .order("created_at", { ascending: false }),
      "list_latest_approved_coi_by_companies_failed"
    );

    for (const row of (data || []) as ContractorCoiRow[]) {
      if (!map[row.company_id]) map[row.company_id] = row;
    }

    return map;
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_latest_approved_coi_by_companies",
      "Unable to load approved COI records."
    );
  }
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

  try {
    const data = unwrapSupabase(
      await supabase
        .from("contractor_companies")
        .select("id, legal_name, dba_name, status")
        .or(`legal_name.ilike.%${query}%,dba_name.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20),
      "search_contractor_companies_failed"
    );

    return (data || []) as ContractorCompanyMini[];
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "search_contractor_companies",
      "Unable to search contractor companies."
    );
  }
}

export async function upsertCustomerContractor(params: {
  contractor_company_id: string;
  status: "approved" | "pending" | "rejected";
}) {
  const customerId = await getMyCustomerId();

  try {
    const result = await supabase.from("customer_contractors").upsert(
      {
        customer_id: customerId,
        contractor_company_id: params.contractor_company_id,
        status: params.status,
      },
      { onConflict: "customer_id,contractor_company_id" }
    );

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "upsert_customer_contractor",
      "Unable to save customer contractor."
    );
  }
}

export async function updateCustomerContractorStatus(
  contractorCompanyId: string,
  status: "approved" | "pending" | "rejected"
) {
  const customerId = await getMyCustomerId();

  try {
    const result = await supabase
      .from("customer_contractors")
      .update({ status })
      .eq("customer_id", customerId)
      .eq("contractor_company_id", contractorCompanyId);

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "update_customer_contractor_status",
      "Unable to update customer contractor status."
    );
  }
}

export async function removeCustomerContractor(contractorCompanyId: string) {
  const customerId = await getMyCustomerId();

  try {
    const result = await supabase
      .from("customer_contractors")
      .delete()
      .eq("customer_id", customerId)
      .eq("contractor_company_id", contractorCompanyId);

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "remove_customer_contractor",
      "Unable to remove customer contractor."
    );
  }
}

export async function listCustomerContractorsByStatus(
  status: "approved" | "pending" | "rejected"
): Promise<ApprovedContractorRow[]> {
  const customerId = await getMyCustomerId();

  try {
    const data = unwrapSupabase(
      await supabase
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
        .order("created_at", { ascending: false }),
      "list_customer_contractors_by_status_failed"
    );

    return normalizeApprovedContractors((data || []) as ApprovedContractorRowDb[]);
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_customer_contractors_by_status",
      "Unable to load customer contractors."
    );
  }
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
  limit_schema: unknown;
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
  try {
    const data = unwrapSupabase(
      await supabase
        .from("insurance_types")
        .select("id, code, name, is_core, limit_schema")
        .order("is_core", { ascending: false })
        .order("name", { ascending: true }),
      "list_insurance_types_failed"
    );

    return (data || []) as InsuranceType[];
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_insurance_types",
      "Unable to load insurance types."
    );
  }
}

export async function listEndorsementTypes(): Promise<EndorsementType[]> {
  try {
    const data = unwrapSupabase(
      await supabase
        .from("endorsement_types")
        .select("id, code, name")
        .order("name", { ascending: true }),
      "list_endorsement_types_failed"
    );

    return (data || []) as EndorsementType[];
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_endorsement_types",
      "Unable to load endorsement types."
    );
  }
}

export type CustomerOrgWithOnboarding = CustomerOrg & {
  onboarding_status?: CustomerOnboardingStatus | null;
};

export async function getCustomerInsuranceConfig(
  customerId: string
): Promise<CustomerInsuranceConfig | null> {
  try {
    const data = unwrapSupabaseNullable(
      await supabase
        .from("customer_insurance_config")
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle(),
      "get_customer_insurance_config_failed"
    );

    return (data ?? null) as CustomerInsuranceConfig | null;
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "get_customer_insurance_config",
      "Unable to load customer insurance config."
    );
  }
}

export async function upsertCustomerInsuranceConfig(
  row: CustomerInsuranceConfig
) {
  try {
    const result = await supabase
      .from("customer_insurance_config")
      .upsert(row, { onConflict: "customer_id" });

    if (result.error) {
      throw result.error;
    }
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "upsert_customer_insurance_config",
      "Unable to save customer insurance config."
    );
  }
}

export async function listCustomerRequiredEndorsements(
  customerId: string
): Promise<string[]> {
  try {
    const data = unwrapSupabase(
      await supabase
        .from("customer_required_endorsements")
        .select("endorsement_type_id")
        .eq("customer_id", customerId),
      "list_customer_required_endorsements_failed"
    );

    return (data || []).map(
      (item: { endorsement_type_id: string }) => item.endorsement_type_id
    );
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "list_customer_required_endorsements",
      "Unable to load customer required endorsements."
    );
  }
}

export async function setCustomerRequiredEndorsements(
  customerId: string,
  endorsementTypeIds: string[]
) {
  try {
    const deleteResult = await supabase
      .from("customer_required_endorsements")
      .delete()
      .eq("customer_id", customerId);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    if (endorsementTypeIds.length === 0) return;

    const insertResult = await supabase
      .from("customer_required_endorsements")
      .insert(
        endorsementTypeIds.map((id) => ({
          customer_id: customerId,
          endorsement_type_id: id,
        }))
      );

    if (insertResult.error) {
      throw insertResult.error;
    }
  } catch (error) {
    throw normalizeCustomerError(
      error,
      "set_customer_required_endorsements",
      "Unable to save customer required endorsements."
    );
  }
}