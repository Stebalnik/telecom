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
