import { supabase } from "./supabaseClient";

export async function recalcCompanyStatus(companyId: string) {
  const { error } = await supabase.rpc("recalc_company_status", { p_company_id: companyId });
  if (error) throw error;
}
