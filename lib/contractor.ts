import { supabase } from "./supabaseClient";
import { getMyUserId } from "./auth";
import { normalizeError } from "./errors/normalizeError";
import { unwrapSupabase } from "./errors/unwrapSupabase";

export type ContractorOnboardingStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export type PayoutMethodType = "ach" | "debit_card" | "other" | string;

export type ContractorPublicProfile = {
  company_id: string;
  headline: string | null;
  markets: string[];
  is_listed: boolean;
  updated_at?: string;
  home_market: string | null;
};

export type Company = {
  id: string;
  legal_name: string;
  dba_name: string | null;
  status: string;
  block_reason?: string | null;
  onboarding_status?: ContractorOnboardingStatus;
  created_at?: string;
  owner_user_id?: string;

  insurance_mode?: string | null;

  fein?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;

  submitted_at?: string | null;

  payout_method_type?: PayoutMethodType | null;
  payout_account_label?: string | null;
  payout_contact_email?: string | null;
  payout_contact_phone?: string | null;
  payout_external_ref?: string | null;

  public_profile?: ContractorPublicProfile | null;
};

export type ContractorOnboardingDraftInput = {
  legal_name: string;
  dba_name?: string | null;
  insurance_mode?: string | null;

  fein?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;

  payout_method_type?: PayoutMethodType | null;
  payout_account_label?: string | null;
  payout_contact_email?: string | null;
  payout_contact_phone?: string | null;
  payout_external_ref?: string | null;

  headline?: string | null;
  home_market?: string | null;
  markets?: string[] | null;
  is_listed?: boolean | null;
};

export type Team = {
  id: string;
  company_id: string;
  name: string;
  status: "active" | "blocked" | "approved" | "pending" | string;
  block_reason: string | null;
  created_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  full_name: string;
  role_title: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  created_at: string;
};

export type CreateMemberInput = {
  teamId: string;
  fullName: string;
  roleTitle?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
};

export type TeamChangeRequest = {
  id: string;
  company_id: string;
  team_id: string;
  requested_by: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamChangeRequestMember = {
  id: string;
  request_id: string;
  full_name: string;
  role_title: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  sort_order: number;
  created_at: string;
};

export type CreateTeamChangeRequestInput = {
  companyId: string;
  teamId: string;
  reason: string;
  members: Array<{
    full_name: string;
    role_title?: string;
    phone?: string;
    email?: string;
    date_of_birth?: string;
  }>;
};

export type TeamChangeRequestListRow = TeamChangeRequest & {
  company_legal_name?: string | null;
  company_dba_name?: string | null;
  team_name?: string | null;
};

export type CustomerMini = {
  id: string;
  name: string;
  description: string | null;
};

export type MyCustomerApplicationRow = {
  customer_id: string;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  customers:
    | {
        id: string;
        name: string;
        description: string | null;
      }
    | {
        id: string;
        name: string;
        description: string | null;
      }[]
    | null;
};

export type CustomerRequirementSummary = {
  customer_id: string;
  insurance: string[];
  scopes: string[];
};

export type CustomerApprovalStatus = "none" | "pending" | "approved" | "rejected";

export type CustomerApprovalRow = {
  customer_id: string;
  contractor_company_id: string;
  status: "pending" | "approved" | "rejected";
  cooldown_until: string | null;
  approval_requested_at: string | null;
  last_applied_at: string | null;
};

export type CustomerPendingContractorRequestRow = {
  customer_id: string;
  contractor_company_id: string;
  status: "pending" | "approved" | "rejected" | string;
  approval_requested_at: string | null;
  cooldown_until: string | null;
  request_count: number;
  contractor_legal_name: string | null;
  contractor_dba_name: string | null;
  contractor_status: string | null;
  contractor_onboarding_status: string | null;
  headline: string | null;
  home_market: string | null;
  available_teams_count: number;
  insurance_types: string[];
  approved_cert_count: number;
  approved_team_members_count: number;
  thread_id: string | null;
  has_thread: boolean;
  last_message_at: string | null;
};

export type RequestThreadMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_role: "customer" | "contractor";
  body: string;
  created_at: string;
};

function normalizeText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value?: string | null): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function normalizeRequiredText(value?: string | null): string {
  return value?.trim() || "";
}

function normalizeOnboardingStatus(
  value?: string | null
): ContractorOnboardingStatus {
  if (value === "approved") return "approved";
  if (value === "submitted") return "submitted";
  if (value === "rejected") return "rejected";
  return "draft";
}

function normalizeMarkets(value?: string[] | null): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => normalizeText(item))
        .filter((item): item is string => Boolean(item))
    )
  );
}

function normalizePublicProfileRow(
  row: Record<string, unknown> | null | undefined,
  companyId?: string
): ContractorPublicProfile | null {
  if (!row) return null;

  return {
    company_id: (row.company_id as string | undefined) || companyId || "",
    headline: (row.headline as string | null | undefined) ?? null,
    markets: normalizeMarkets((row.markets as string[] | null | undefined) ?? []),
    is_listed: Boolean(row.is_listed),
    updated_at: (row.updated_at as string | undefined) ?? undefined,
    home_market: (row.home_market as string | null | undefined) ?? null,
  };
}

function mapCompanyRow(row: Record<string, unknown>): Company {
  const publicProfileRaw = row.public_profile as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null
    | undefined;

  const publicProfile = Array.isArray(publicProfileRaw)
    ? normalizePublicProfileRow(publicProfileRaw[0] ?? null, String(row.id))
    : normalizePublicProfileRow(publicProfileRaw ?? null, String(row.id));

  return {
    id: String(row.id),
    owner_user_id: (row.owner_user_id as string | undefined) ?? undefined,
    legal_name: String(row.legal_name ?? ""),
    dba_name: (row.dba_name as string | null | undefined) ?? null,
    status: String(row.status ?? ""),
    block_reason: (row.block_reason as string | null | undefined) ?? null,
    onboarding_status: normalizeOnboardingStatus(
      row.onboarding_status as string | null | undefined
    ),
    created_at: (row.created_at as string | undefined) ?? undefined,

    insurance_mode: (row.insurance_mode as string | null | undefined) ?? null,

    fein: (row.fein as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? null,
    email: (row.email as string | null | undefined) ?? null,
    address_line1: (row.address_line1 as string | null | undefined) ?? null,
    address_line2: (row.address_line2 as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    state: (row.state as string | null | undefined) ?? null,
    zip: (row.zip as string | null | undefined) ?? null,
    country: (row.country as string | null | undefined) ?? null,

    submitted_at: (row.submitted_at as string | null | undefined) ?? null,

    payout_method_type:
      (row.payout_method_type as PayoutMethodType | null | undefined) ?? null,
    payout_account_label:
      (row.payout_account_label as string | null | undefined) ?? null,
    payout_contact_email:
      (row.payout_contact_email as string | null | undefined) ?? null,
    payout_contact_phone:
      (row.payout_contact_phone as string | null | undefined) ?? null,
    payout_external_ref:
      (row.payout_external_ref as string | null | undefined) ?? null,

    public_profile: publicProfile,
  };
}

function buildCompanyDraftPayload(
  input: ContractorOnboardingDraftInput,
  status: ContractorOnboardingStatus
) {
  return {
    legal_name: normalizeRequiredText(input.legal_name),
    dba_name: normalizeText(input.dba_name),
    insurance_mode: normalizeText(input.insurance_mode) || "either",

    fein: normalizeText(input.fein),
    phone: normalizeText(input.phone),
    email: normalizeEmail(input.email),
    address_line1: normalizeText(input.address_line1),
    address_line2: normalizeText(input.address_line2),
    city: normalizeText(input.city),
    state: normalizeText(input.state),
    zip: normalizeText(input.zip),
    country: normalizeText(input.country) || "US",

    onboarding_status: status,
    submitted_at: status === "submitted" ? new Date().toISOString() : null,

    payout_method_type: normalizeText(input.payout_method_type),
    payout_account_label: normalizeText(input.payout_account_label),
    payout_contact_email: normalizeEmail(input.payout_contact_email),
    payout_contact_phone: normalizeText(input.payout_contact_phone),
    payout_external_ref: normalizeText(input.payout_external_ref),
  };
}

function buildPublicProfileDraftPayload(
  companyId: string,
  input: ContractorOnboardingDraftInput
) {
  return {
    company_id: companyId,
    headline: normalizeText(input.headline),
    markets: normalizeMarkets(input.markets),
    home_market: normalizeText(input.home_market),
    is_listed: Boolean(input.is_listed),
  };
}

const COMPANY_SELECT = `
  id,
  owner_user_id,
  legal_name,
  dba_name,
  status,
  block_reason,
  onboarding_status,
  created_at,
  insurance_mode,
  fein,
  phone,
  email,
  address_line1,
  address_line2,
  city,
  state,
  zip,
  country,
  submitted_at,
  payout_method_type,
  payout_account_label,
  payout_contact_email,
  payout_contact_phone,
  payout_external_ref,
  public_profile:contractor_public_profiles (
    company_id,
    headline,
    markets,
    is_listed,
    updated_at,
    home_market
  )
`;

async function savePublicProfileDraft(
  companyId: string,
  input: ContractorOnboardingDraftInput
): Promise<void> {
  const result = await supabase.from("contractor_public_profiles").upsert(
    buildPublicProfileDraftPayload(companyId, input),
    {
      onConflict: "company_id",
    }
  );

  if (result.error) {
    throw normalizeError(
      result.error,
      "save_contractor_public_profile_draft_failed",
      "Unable to save contractor public profile."
    );
  }
}

export async function applyApprovedTeamChangeRequest(requestId: string) {
  const result = await supabase.rpc("apply_approved_team_change_request", {
    p_request_id: requestId,
  });

  if (result.error) {
    throw normalizeError(
      result.error,
      "apply_approved_team_change_request_failed",
      "Unable to apply approved team change request."
    );
  }
}

export async function listMyTeamChangeRequestsDetailed(): Promise<
  TeamChangeRequestListRow[]
> {
  const company = await getMyCompany();
  if (!company) return [];

  const result = await supabase
    .from("team_change_requests_with_company")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (unwrapSupabase(
    result,
    "list_my_team_change_requests_detailed_failed",
    "Unable to load team change requests."
  ) || []) as TeamChangeRequestListRow[];
}

export async function getMyCompany(): Promise<Company | null> {
  const uid = await getMyUserId();

  const result = await supabase
    .from("contractor_companies")
    .select(COMPANY_SELECT)
    .eq("owner_user_id", uid)
    .maybeSingle();

  if (result.error) {
    throw normalizeError(
      result.error,
      "get_my_company_failed",
      "Unable to load contractor company."
    );
  }

  if (!result.data) {
    return null;
  }

  return mapCompanyRow(result.data as Record<string, unknown>);
}

export async function ensureMyCompanyDraft(): Promise<Company> {
  const existing = await getMyCompany();

  if (existing) {
    return existing;
  }

  const uid = await getMyUserId();

  const insertResult = await supabase
    .from("contractor_companies")
    .insert({
      owner_user_id: uid,
      legal_name: "",
      dba_name: null,
      onboarding_status: "draft",
      country: "US",
      insurance_mode: "either",
    })
    .select(COMPANY_SELECT)
    .single();

  if (insertResult.error) {
    const duplicateLike =
      insertResult.error.code === "23505" ||
      String(insertResult.error.message || "").toLowerCase().includes("duplicate");

    if (duplicateLike) {
      const reloaded = await getMyCompany();

      if (reloaded) {
        return reloaded;
      }
    }

    throw normalizeError(
      insertResult.error,
      "ensure_my_company_draft_failed",
      "Unable to create contractor company draft."
    );
  }

  const company = mapCompanyRow(insertResult.data as Record<string, unknown>);

  await savePublicProfileDraft(company.id, {
    legal_name: company.legal_name,
    dba_name: company.dba_name,
    insurance_mode: company.insurance_mode,
    fein: company.fein,
    phone: company.phone,
    email: company.email,
    address_line1: company.address_line1,
    address_line2: company.address_line2,
    city: company.city,
    state: company.state,
    zip: company.zip,
    country: company.country,
    payout_method_type: company.payout_method_type,
    payout_account_label: company.payout_account_label,
    payout_contact_email: company.payout_contact_email,
    payout_contact_phone: company.payout_contact_phone,
    payout_external_ref: company.payout_external_ref,
    headline: "",
    home_market: null,
    markets: [],
    is_listed: false,
  });

  return (await getMyCompany()) ?? company;
}

export async function saveMyCompanyDraft(
  input: ContractorOnboardingDraftInput
): Promise<Company> {
  const company = await ensureMyCompanyDraft();

  const updateResult = await supabase
    .from("contractor_companies")
    .update(buildCompanyDraftPayload(input, "draft"))
    .eq("id", company.id)
    .select(COMPANY_SELECT)
    .single();

  if (updateResult.error) {
    throw normalizeError(
      updateResult.error,
      "save_my_company_draft_failed",
      "Unable to save contractor company draft."
    );
  }

  await savePublicProfileDraft(company.id, input);

  return (await getMyCompany()) || mapCompanyRow(updateResult.data as Record<string, unknown>);
}

export async function submitMyCompanyForReview(
  input: ContractorOnboardingDraftInput
): Promise<Company> {
  const company = await ensureMyCompanyDraft();

  const updateResult = await supabase
    .from("contractor_companies")
    .update(buildCompanyDraftPayload(input, "submitted"))
    .eq("id", company.id)
    .select(COMPANY_SELECT)
    .single();

  if (updateResult.error) {
    throw normalizeError(
      updateResult.error,
      "submit_my_company_for_review_failed",
      "Unable to submit contractor onboarding for review."
    );
  }

  await savePublicProfileDraft(company.id, {
    ...input,
    is_listed: false,
  });

  return (await getMyCompany()) || mapCompanyRow(updateResult.data as Record<string, unknown>);
}

/**
 * Для экранов, где удобнее работать со списком.
 */
export async function listMyCompanies(): Promise<Company[]> {
  const uid = await getMyUserId();

  const result = await supabase
    .from("contractor_companies")
    .select(COMPANY_SELECT)
    .eq("owner_user_id", uid)
    .order("created_at", { ascending: false });

  const data = unwrapSupabase(
    result,
    "list_my_companies_failed",
    "Unable to load contractor companies."
  ) as Record<string, unknown>[];

  return (data || []).map(mapCompanyRow);
}

export async function createCompany(legal_name: string, dba_name?: string) {
  const uid = await getMyUserId();

  const result = await supabase.from("contractor_companies").insert({
    owner_user_id: uid,
    legal_name: legal_name.trim(),
    dba_name: normalizeText(dba_name),
  });

  if (result.error) {
    throw normalizeError(
      result.error,
      "create_company_failed",
      "Unable to create contractor company."
    );
  }
}

export async function updateCompany(
  companyId: string,
  legal_name: string,
  dba_name?: string
) {
  const result = await supabase
    .from("contractor_companies")
    .update({
      legal_name: legal_name.trim(),
      dba_name: normalizeText(dba_name),
    })
    .eq("id", companyId);

  if (result.error) {
    throw normalizeError(
      result.error,
      "update_company_failed",
      "Unable to update contractor company."
    );
  }
}

export async function listTeams(companyId: string): Promise<Team[]> {
  const result = await supabase
    .from("teams")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return (unwrapSupabase(
    result,
    "list_teams_failed",
    "Unable to load teams."
  ) || []) as Team[];
}

export async function createTeam(companyId: string, name: string): Promise<Team> {
  const result = await supabase
    .from("teams")
    .insert({
      company_id: companyId,
      name: name.trim(),
    })
    .select("*")
    .single();

  if (result.error) {
    throw normalizeError(
      result.error,
      "create_team_failed",
      "Unable to create team."
    );
  }

  return result.data as Team;
}

export async function listMembers(teamId: string): Promise<TeamMember[]> {
  const result = await supabase
    .from("team_members")
    .select(
      `
      id,
      team_id,
      full_name,
      role_title,
      phone,
      email,
      date_of_birth,
      created_at
      `
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  return (unwrapSupabase(
    result,
    "list_members_failed",
    "Unable to load team members."
  ) || []) as TeamMember[];
}

// old signature
export async function createMember(
  teamId: string,
  full_name: string,
  role_title?: string
): Promise<TeamMember>;

// new signature
export async function createMember(input: CreateMemberInput): Promise<TeamMember>;

export async function createMember(
  arg1: string | CreateMemberInput,
  arg2?: string,
  arg3?: string
): Promise<TeamMember> {
  let payload: {
    team_id: string;
    full_name: string;
    role_title: string | null;
    phone: string | null;
    email: string | null;
    date_of_birth: string | null;
  };

  if (typeof arg1 === "string") {
    payload = {
      team_id: arg1,
      full_name: (arg2 || "").trim(),
      role_title: normalizeText(arg3),
      phone: null,
      email: null,
      date_of_birth: null,
    };
  } else {
    payload = {
      team_id: arg1.teamId,
      full_name: arg1.fullName.trim(),
      role_title: normalizeText(arg1.roleTitle),
      phone: normalizeText(arg1.phone),
      email: normalizeEmail(arg1.email),
      date_of_birth: arg1.dateOfBirth || null,
    };
  }

  const result = await supabase
    .from("team_members")
    .insert(payload)
    .select(
      `
      id,
      team_id,
      full_name,
      role_title,
      phone,
      email,
      date_of_birth,
      created_at
      `
    )
    .single();

  if (result.error) {
    throw normalizeError(
      result.error,
      "create_member_failed",
      "Unable to create team member."
    );
  }

  return result.data as TeamMember;
}

/** alias чтобы в коде было читаемо */
export const listCompanyTeams = listTeams;

export function normalizeCustomerRelation(
  customer:
    | {
        id: string;
        name: string;
        description: string | null;
      }
    | {
        id: string;
        name: string;
        description: string | null;
      }[]
    | null
) {
  return Array.isArray(customer) ? customer[0] ?? null : customer;
}

export async function searchCustomers(q: string): Promise<CustomerMini[]> {
  const query = q.trim();
  if (!query) return [];

  const result = await supabase
    .from("customers")
    .select("id, name, description")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  return (unwrapSupabase(
    result,
    "search_customers_failed",
    "Unable to search customers."
  ) || []) as CustomerMini[];
}

export async function applyToCustomer(customerId: string) {
  const company = await getMyCompany();
  if (!company) {
    throw normalizeError(
      new Error("Create your contractor company first"),
      "apply_to_customer_no_company",
      "Create your contractor company first."
    );
  }

  const result = await supabase.from("customer_contractors").upsert(
    {
      customer_id: customerId,
      contractor_company_id: company.id,
      status: "pending",
    },
    { onConflict: "customer_id,contractor_company_id" }
  );

  if (result.error) {
    throw normalizeError(
      result.error,
      "apply_to_customer_failed",
      "Unable to apply to customer."
    );
  }
}

export async function listMyCustomerApplications(): Promise<MyCustomerApplicationRow[]> {
  const company = await getMyCompany();
  if (!company) return [];

  const result = await supabase
    .from("customer_contractors")
    .select(
      `
      customer_id,
      status,
      created_at,
      customers:customers!customer_contractors_customer_id_fkey (
        id,
        name,
        description
      )
    `
    )
    .eq("contractor_company_id", company.id)
    .order("created_at", { ascending: false });

  return (unwrapSupabase(
    result,
    "list_my_customer_applications_failed",
    "Unable to load customer applications."
  ) || []) as MyCustomerApplicationRow[];
}

export async function listCustomerRequirementSummaries(
  customerIds: string[]
): Promise<Record<string, CustomerRequirementSummary>> {
  const uniqueCustomerIds = Array.from(new Set(customerIds.filter(Boolean)));
  const result: Record<string, CustomerRequirementSummary> = {};

  if (uniqueCustomerIds.length === 0) return result;

  const [
    insuranceReqRows,
    scopeReqRows,
    insuranceTypesRows,
    scopesRows,
  ] = await Promise.all([
    supabase
      .from("customer_insurance_requirements")
      .select("customer_id, insurance_type_id, is_required")
      .in("customer_id", uniqueCustomerIds)
      .eq("is_required", true),

    supabase
      .from("customer_scope_requirements")
      .select("customer_id, scope_id")
      .in("customer_id", uniqueCustomerIds),

    supabase.from("insurance_types").select("id, name"),

    supabase.from("scopes").select("id, name"),
  ]);

  if (insuranceReqRows.error) {
    throw normalizeError(
      insuranceReqRows.error,
      "list_customer_requirement_insurance_failed",
      "Unable to load customer insurance requirements."
    );
  }

  if (scopeReqRows.error) {
    throw normalizeError(
      scopeReqRows.error,
      "list_customer_requirement_scopes_failed",
      "Unable to load customer scope requirements."
    );
  }

  if (insuranceTypesRows.error) {
    throw normalizeError(
      insuranceTypesRows.error,
      "list_insurance_types_failed",
      "Unable to load insurance types."
    );
  }

  if (scopesRows.error) {
    throw normalizeError(
      scopesRows.error,
      "list_scopes_failed",
      "Unable to load scopes."
    );
  }

  const insuranceNameById = new Map(
    (insuranceTypesRows.data || []).map((row: any) => [row.id, row.name] as const)
  );

  const scopeNameById = new Map(
    (scopesRows.data || []).map((row: any) => [row.id, row.name] as const)
  );

  for (const customerId of uniqueCustomerIds) {
    result[customerId] = {
      customer_id: customerId,
      insurance: [],
      scopes: [],
    };
  }

  for (const row of insuranceReqRows.data || []) {
    const customerId = (row as any).customer_id as string;
    const insuranceTypeId = (row as any).insurance_type_id as string;
    const name = insuranceNameById.get(insuranceTypeId);
    if (!name) continue;
    result[customerId]?.insurance.push(name);
  }

  for (const row of scopeReqRows.data || []) {
    const customerId = (row as any).customer_id as string;
    const scopeId = (row as any).scope_id as string;
    const name = scopeNameById.get(scopeId);
    if (!name) continue;
    result[customerId]?.scopes.push(name);
  }

  for (const customerId of uniqueCustomerIds) {
    result[customerId].insurance = Array.from(
      new Set(result[customerId].insurance)
    );
    result[customerId].scopes = Array.from(
      new Set(result[customerId].scopes)
    );
  }

  return result;
}

/* =========================
   TEAM CHANGE REQUESTS
   ========================= */

export async function createTeamChangeRequest(
  input: CreateTeamChangeRequestInput
): Promise<TeamChangeRequest> {
  const uid = await getMyUserId();

  const requestResult = await supabase
    .from("team_change_requests")
    .insert({
      company_id: input.companyId,
      team_id: input.teamId,
      requested_by: uid,
      reason: input.reason.trim(),
      status: "pending",
    })
    .select("*")
    .single();

  if (requestResult.error) {
    throw normalizeError(
      requestResult.error,
      "create_team_change_request_failed",
      "Unable to create team change request."
    );
  }

  const requestRow = requestResult.data as TeamChangeRequest;
  const requestId = requestRow.id;

  const validMembers = input.members
    .filter((member) => member.full_name.trim())
    .map((member, index) => ({
      request_id: requestId,
      full_name: member.full_name.trim(),
      role_title: normalizeText(member.role_title),
      phone: normalizeText(member.phone),
      email: normalizeEmail(member.email),
      date_of_birth: member.date_of_birth || null,
      sort_order: index,
    }));

  if (validMembers.length > 0) {
    const membersResult = await supabase
      .from("team_change_request_members")
      .insert(validMembers);

    if (membersResult.error) {
      throw normalizeError(
        membersResult.error,
        "create_team_change_request_members_failed",
        "Unable to save team change request members."
      );
    }
  }

  return requestRow;
}

export async function listMyTeamChangeRequests(): Promise<TeamChangeRequest[]> {
  const company = await getMyCompany();
  if (!company) return [];

  const result = await supabase
    .from("team_change_requests")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (unwrapSupabase(
    result,
    "list_my_team_change_requests_failed",
    "Unable to load team change requests."
  ) || []) as TeamChangeRequest[];
}

export async function getTeamChangeRequestById(
  requestId: string
): Promise<TeamChangeRequest | null> {
  const result = await supabase
    .from("team_change_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (result.error) {
    throw normalizeError(
      result.error,
      "get_team_change_request_by_id_failed",
      "Unable to load team change request."
    );
  }

  return (result.data as TeamChangeRequest | null) || null;
}

export async function listTeamChangeRequestMembers(
  requestId: string
): Promise<TeamChangeRequestMember[]> {
  const result = await supabase
    .from("team_change_request_members")
    .select("*")
    .eq("request_id", requestId)
    .order("sort_order", { ascending: true });

  return (unwrapSupabase(
    result,
    "list_team_change_request_members_failed",
    "Unable to load team change request members."
  ) || []) as TeamChangeRequestMember[];
}

export async function listAdminTeamChangeRequests(): Promise<TeamChangeRequest[]> {
  const result = await supabase
    .from("team_change_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return (unwrapSupabase(
    result,
    "list_admin_team_change_requests_failed",
    "Unable to load admin team change requests."
  ) || []) as TeamChangeRequest[];
}

export async function updateTeamChangeRequestStatus(params: {
  requestId: string;
  status: "approved" | "rejected";
  adminNote?: string;
}) {
  const current = await getTeamChangeRequestById(params.requestId);

  if (!current) {
    throw normalizeError(
      new Error("Team change request not found."),
      "team_change_request_not_found",
      "Team change request not found."
    );
  }

  if (current.status !== "pending") {
    throw normalizeError(
      new Error("This team change request has already been finalized."),
      "team_change_request_already_finalized",
      "This team change request has already been finalized."
    );
  }

  const result = await supabase
    .from("team_change_requests")
    .update({
      status: params.status,
      admin_note: normalizeText(params.adminNote),
    })
    .eq("id", params.requestId)
    .eq("status", "pending");

  if (result.error) {
    throw normalizeError(
      result.error,
      "update_team_change_request_status_failed",
      "Unable to update team change request status."
    );
  }
}

export async function listMyCustomerApprovalRows(): Promise<CustomerApprovalRow[]> {
  const uid = await getMyUserId();

  const companyResult = await supabase
    .from("contractor_companies")
    .select("id")
    .eq("owner_user_id", uid)
    .maybeSingle();

  if (companyResult.error) {
    throw normalizeError(
      companyResult.error,
      "list_my_customer_approval_company_failed",
      "Unable to load contractor company."
    );
  }

  const company = companyResult.data as { id?: string } | null;

  if (!company?.id) return [];

  const result = await supabase
    .from("customer_contractors")
    .select(
      "customer_id, contractor_company_id, status, cooldown_until, approval_requested_at, last_applied_at"
    )
    .eq("contractor_company_id", company.id);

  return (unwrapSupabase(
    result,
    "list_my_customer_approval_rows_failed",
    "Unable to load customer approval rows."
  ) || []) as CustomerApprovalRow[];
}

export function approvalRowByCustomerId(
  rows: CustomerApprovalRow[]
): Record<string, CustomerApprovalRow> {
  const map: Record<string, CustomerApprovalRow> = {};
  for (const row of rows) {
    map[row.customer_id] = row;
  }
  return map;
}

export async function requestCustomerApproval(
  customerId: string,
  contractorCompanyId: string
): Promise<{
  ok: boolean;
  status?: string;
  cooldown_until?: string | null;
  message?: string;
  error?: string;
}> {
  const res = await fetch("/api/customer-approvals/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId,
      contractorCompanyId,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw normalizeError(
      new Error(
        (json as { error?: string } | null)?.error || "Failed to request approval"
      ),
      "request_customer_approval_failed",
      "Failed to request customer approval."
    );
  }

  return (json || {}) as {
    ok: boolean;
    status?: string;
    cooldown_until?: string | null;
    message?: string;
    error?: string;
  };
}

export async function listCustomerPendingContractorRequests(
  customerId: string
): Promise<CustomerPendingContractorRequestRow[]> {
  const result = await supabase.rpc(
    "list_customer_pending_contractor_requests",
    { p_customer_id: customerId }
  );

  return (unwrapSupabase(
    result,
    "list_customer_pending_contractor_requests_failed",
    "Unable to load pending contractor requests."
  ) || []) as CustomerPendingContractorRequestRow[];
}

export async function customerReviewContractorRequest(args: {
  customerId: string;
  contractorCompanyId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const result = await supabase.rpc("customer_review_contractor_request", {
    p_customer_id: args.customerId,
    p_contractor_company_id: args.contractorCompanyId,
    p_decision: args.decision,
    p_note: args.note || null,
  });

  const data = unwrapSupabase(
    result,
    "customer_review_contractor_request_failed",
    "Unable to review contractor request."
  ) as { ok: boolean; status: string };

  return data;
}

export async function customerStartOrGetRequestThread(args: {
  customerId: string;
  contractorCompanyId: string;
  firstMessage: string;
}) {
  const result = await supabase.rpc("customer_start_or_get_request_thread", {
    p_customer_id: args.customerId,
    p_contractor_company_id: args.contractorCompanyId,
    p_first_message: args.firstMessage,
  });

  const data = unwrapSupabase(
    result,
    "customer_start_or_get_request_thread_failed",
    "Unable to open request thread."
  ) as string;

  return data;
}

export async function listRequestThreadMessages(
  threadId: string
): Promise<RequestThreadMessage[]> {
  const result = await supabase
    .from("customer_contractor_request_messages")
    .select("id, thread_id, sender_user_id, sender_role, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return (unwrapSupabase(
    result,
    "list_request_thread_messages_failed",
    "Unable to load request thread messages."
  ) || []) as RequestThreadMessage[];
}