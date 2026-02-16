import { supabase } from "./supabaseClient";

export type Company = {
  id: string;
  owner_user_id: string;
  legal_name: string;
  dba_name: string | null;
  status: "active" | "blocked";
  block_reason: string | null;
  created_at: string;
};

export type Team = {
  id: string;
  company_id: string;
  name: string;
  status: "active" | "blocked";
  block_reason: string | null;
  created_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  full_name: string;
  role_title: string | null;
  created_at: string;
};

export async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Not logged in");
  return data.user.id;
}

/**
 * В твоём MVP: одна компания на аккаунт.
 * Возвращает компанию или null.
 */
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
 * Для экранов, где удобнее работать со списком (например bidding):
 * даже если компания одна — вернём массив.
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
    legal_name,
    dba_name: dba_name || null,
  });
  if (error) throw error;
}

export async function updateCompany(companyId: string, legal_name: string, dba_name?: string) {
  const { error } = await supabase
    .from("contractor_companies")
    .update({ legal_name, dba_name: dba_name || null })
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

export async function createTeam(companyId: string, name: string) {
  const { error } = await supabase.from("teams").insert({
    company_id: companyId,
    name,
  });
  if (error) throw error;
}

export async function listMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TeamMember[];
}

export async function createMember(teamId: string, full_name: string, role_title?: string) {
  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    full_name,
    role_title: role_title || null,
  });
  if (error) throw error;
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
  status: "pending" | "approved" | "rejected";
  created_at: string;
  customers: {
    id: string;
    name: string;
    description: string | null;
  }[];
};

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

// Создать заявку contractor->customer со статусом pending
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

// Список моих заявок (pending/approved/rejected)
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
      customers:customer_id (
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
