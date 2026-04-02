import { supabase } from "./supabaseClient";
import { getMyUserId } from "./auth";

export type Company = {
  id: string;
  legal_name: string;
  dba_name: string | null;
  status: string;
  block_reason?: string | null;
  onboarding_status?: "draft" | "submitted" | "approved";
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

function normalizeText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value?: string | null): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export type TeamChangeRequestListRow = TeamChangeRequest & {
  company_legal_name?: string | null;
  company_dba_name?: string | null;
  team_name?: string | null;
};

export async function applyApprovedTeamChangeRequest(requestId: string) {
  const { error } = await supabase.rpc("apply_approved_team_change_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
}

export async function listMyTeamChangeRequestsDetailed(): Promise<
  TeamChangeRequestListRow[]
> {
  const company = await getMyCompany();
  if (!company) return [];

  const { data, error } = await supabase
    .from("team_change_requests_with_company")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TeamChangeRequestListRow[];
}

export async function getMyCompany(): Promise<Company | null> {
  const uid = await getMyUserId();

  const { data, error } = await supabase
    .from("contractor_companies")
    .select("*")
    .eq("owner_user_id", uid)
    .maybeSingle();

  if (error) throw error;
  return data as Company | null;
}

/**
 * Для экранов, где удобнее работать со списком.
 */
export async function listMyCompanies(): Promise<Company[]> {
  const uid = await getMyUserId();

  const { data, error } = await supabase
    .from("contractor_companies")
    .select("*")
    .eq("owner_user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Company[];
}

export async function createCompany(legal_name: string, dba_name?: string) {
  const uid = await getMyUserId();

  const { error } = await supabase.from("contractor_companies").insert({
    owner_user_id: uid,
    legal_name: legal_name.trim(),
    dba_name: normalizeText(dba_name),
  });

  if (error) throw error;
}

export async function updateCompany(
  companyId: string,
  legal_name: string,
  dba_name?: string
) {
  const { error } = await supabase
    .from("contractor_companies")
    .update({
      legal_name: legal_name.trim(),
      dba_name: normalizeText(dba_name),
    })
    .eq("id", companyId);

  if (error) throw error;
}

export async function listTeams(companyId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Team[];
}

export async function createTeam(companyId: string, name: string): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      company_id: companyId,
      name: name.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Team;
}

export async function listMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
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

  if (error) throw error;
  return (data || []) as TeamMember[];
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

  const { data, error } = await supabase
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

  if (error) throw error;
  return data as TeamMember;
}

/** alias чтобы в коде было читаемо */
export const listCompanyTeams = listTeams;

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

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, description")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []) as CustomerMini[];
}

export async function applyToCustomer(customerId: string) {
  const company = await getMyCompany();
  if (!company) throw new Error("Create your contractor company first");

  const { error } = await supabase
    .from("customer_contractors")
    .upsert(
      {
        customer_id: customerId,
        contractor_company_id: company.id,
        status: "pending",
      },
      { onConflict: "customer_id,contractor_company_id" }
    );

  if (error) throw error;
}

export async function listMyCustomerApplications(): Promise<MyCustomerApplicationRow[]> {
  const company = await getMyCompany();
  if (!company) return [];

  const { data, error } = await supabase
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

  if (error) throw error;
  return (data || []) as MyCustomerApplicationRow[];
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

  if (insuranceReqRows.error) throw insuranceReqRows.error;
  if (scopeReqRows.error) throw scopeReqRows.error;
  if (insuranceTypesRows.error) throw insuranceTypesRows.error;
  if (scopesRows.error) throw scopesRows.error;

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

  const { data: requestRow, error: requestError } = await supabase
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

  if (requestError) throw requestError;

  const requestId = (requestRow as TeamChangeRequest).id;

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
    const { error: membersError } = await supabase
      .from("team_change_request_members")
      .insert(validMembers);

    if (membersError) throw membersError;
  }

  return requestRow as TeamChangeRequest;
}

export async function listMyTeamChangeRequests(): Promise<TeamChangeRequest[]> {
  const company = await getMyCompany();
  if (!company) return [];

  const { data, error } = await supabase
    .from("team_change_requests")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TeamChangeRequest[];
}

export async function getTeamChangeRequestById(
  requestId: string
): Promise<TeamChangeRequest | null> {
  const { data, error } = await supabase
    .from("team_change_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  return (data as TeamChangeRequest | null) || null;
}

export async function listTeamChangeRequestMembers(
  requestId: string
): Promise<TeamChangeRequestMember[]> {
  const { data, error } = await supabase
    .from("team_change_request_members")
    .select("*")
    .eq("request_id", requestId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []) as TeamChangeRequestMember[];
}

export async function listAdminTeamChangeRequests(): Promise<TeamChangeRequest[]> {
  const { data, error } = await supabase
    .from("team_change_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TeamChangeRequest[];
}

export async function updateTeamChangeRequestStatus(params: {
  requestId: string;
  status: "approved" | "rejected";
  adminNote?: string;
}) {
  const current = await getTeamChangeRequestById(params.requestId);

  if (!current) {
    throw new Error("Team change request not found.");
  }

  if (current.status !== "pending") {
    throw new Error("This team change request has already been finalized.");
  }

  const { error } = await supabase
    .from("team_change_requests")
    .update({
      status: params.status,
      admin_note: normalizeText(params.adminNote),
    })
    .eq("id", params.requestId)
    .eq("status", "pending");

  if (error) throw error;
}