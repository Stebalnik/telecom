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
