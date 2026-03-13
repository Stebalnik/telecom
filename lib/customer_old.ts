import { supabase } from "./supabaseClient";

export type ApprovedContractorRow = {
  contractor_company_id: string;
  status: string;
  contractor_companies: {
    id: string;
    legal_name: string;
    dba_name: string | null;
  } | null;
};

export type ContractorCoiRow = {
  id: string;           // COI record id
  company_id: string;
  status: string;       // approved / pending / rejected (как у тебя сделано)
  file_path: string;
  created_at: string;
};

export async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) throw new Error("Not logged in");
  return data.session?.user.id;
}

// Находим customer.id по customers.owner_user_id = auth.uid()
export async function getMyCustomerId(): Promise<string> {
  const uid = await getMyUserId();

  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("owner_user_id", uid)
    .single();

  if (error) throw error;
  return data.id as string;
}

// Список approved contractor'ов (из таблицы customer_contractors)
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

// Достаём COI по списку company_id (берём последний approved COI для каждой компании)
export async function listLatestApprovedCoiByCompanies(
  companyIds: string[]
): Promise<Record<string, ContractorCoiRow | null>> {
  const result: Record<string, ContractorCoiRow | null> = {};
  companyIds.forEach((id) => (result[id] = null));
  if (companyIds.length === 0) return result;

  // Важно: customer должен иметь RLS право читать contractor_coi (мы добавим SQL ниже)
  const { data, error } = await supabase
    .from("contractor_coi")
    .select("id, company_id, status, file_path, created_at")
    .in("company_id", companyIds)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Берём первый (самый новый) COI на компанию
  for (const row of (data || []) as ContractorCoiRow[]) {
    if (!result[row.company_id]) result[row.company_id] = row;
  }

  return result;
}
