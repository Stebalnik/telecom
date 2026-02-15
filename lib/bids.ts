import { supabase } from "./supabaseClient";

export type Bid = {
  id: string;
  job_id: string;
  company_id: string;
  team_id: string | null;
  price: number;
  message: string | null;
  status: "submitted" | "accepted" | "rejected";
  created_at: string;
};

export async function submitBid(params: {
  jobId: string;
  companyId: string;
  teamId: string | null;
  price: number;
  message?: string;
}) {
  const { error } = await supabase.from("bids").insert({
    job_id: params.jobId,
    company_id: params.companyId,
    team_id: params.teamId,
    price: params.price,
    message: params.message || null,
  });

  if (error) throw error;
}

export async function listMyBids(companyId: string): Promise<Bid[]> {
  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Bid[];
}

export async function eligibleTeamsForJob(companyId: string, jobId: string) {
  const { data, error } = await supabase.rpc("eligible_teams_for_job", {
    p_company_id: companyId,
    p_job_id: jobId,
  });

  if (error) throw error;
  return (data || []) as { team_id: string; team_name: string }[];
}
