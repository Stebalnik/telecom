import { supabase } from "./supabaseClient";
import { getMyCompany } from "./contractor";

export type MarketplaceContractor = {
  company_id: string;
  legal_name: string;
  dba_name: string | null;
  headline: string | null;
  markets: string[];
  available_teams_count: number;
  insurance_types: string[];
  average_rating: number;
  reviews_count: number;
};

export type ContractorPublicProfile = {
  company_id: string;
  headline: string | null;
  markets: string[];
  is_listed: boolean;
  updated_at: string;
};

export async function listMarketplaceContractors(
  search: string = ""
): Promise<MarketplaceContractor[]> {
  const { data, error } = await supabase.rpc("list_marketplace_contractors", {
    p_search: search.trim() || null,
  });

  if (error) throw error;
  return (data || []) as MarketplaceContractor[];
}

export async function getMyContractorPublicProfile(): Promise<ContractorPublicProfile | null> {
  const company = await getMyCompany();
  if (!company) return null;

  const { data, error } = await supabase
    .from("contractor_public_profiles")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ContractorPublicProfile | null;
}

export async function upsertMyContractorPublicProfile(params: {
  headline?: string | null;
  markets: string[];
  is_listed: boolean;
}) {
  const company = await getMyCompany();
  if (!company) throw new Error("Company not found");

  const { error } = await supabase
    .from("contractor_public_profiles")
    .upsert(
      {
        company_id: company.id,
        headline: params.headline?.trim() || null,
        markets: params.markets,
        is_listed: params.is_listed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );

  if (error) throw error;
}