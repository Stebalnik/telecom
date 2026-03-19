import { supabase } from "./supabaseClient";

export type JobVisibilityMode = "public" | "qualified_only" | "approved_only";

export type Job = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: "open" | "closed";
  created_at: string;
  customer_id: string | null;
  customer_user_id: string | null;
  deadline_date: string | null;
  visibility_mode: JobVisibilityMode;
};

export async function createJob(params: {
  title: string;
  description?: string;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  customerId?: string;
  deadlineDate?: string;
  visibilityMode?: JobVisibilityMode;
}) {
  const { data: userData, error: userErr } = await supabase.auth.getSession();
  if (userErr) throw userErr;
  if (!userData.session?.user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      customer_user_id: userData.session.user.id,
      customer_id: params.customerId ?? null,
      title: params.title,
      description: params.description || null,
      location: params.location || null,
      budget_min: params.budgetMin ?? null,
      budget_max: params.budgetMax ?? null,
      deadline_date: params.deadlineDate ?? null,
      visibility_mode: params.visibilityMode ?? "public",
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Job;
}

export async function listOpenJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Job[];
}

export async function listMyJobs(): Promise<Job[]> {
  const { data: userData, error: userErr } = await supabase.auth.getSession();
  if (userErr) throw userErr;
  if (!userData.session?.user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("customer_user_id", userData.session.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Job[];
}

export async function setJobRequiredCerts(
  jobId: string,
  certTypeIds: string[]
) {
  const { error: delErr } = await supabase
    .from("job_required_certs")
    .delete()
    .eq("job_id", jobId);
  if (delErr) throw delErr;

  if (certTypeIds.length === 0) return;

  const { error } = await supabase.from("job_required_certs").insert(
    certTypeIds.map((id) => ({ job_id: jobId, cert_type_id: id }))
  );
  if (error) throw error;
}

export async function getJobRequiredCerts(jobId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("job_required_certs")
    .select("cert_type_id")
    .eq("job_id", jobId);

  if (error) throw error;
  return (data || []).map((x: any) => x.cert_type_id);
}

export async function setJobScopes(jobId: string, scopeIds: string[]) {
  const { error: delErr } = await supabase
    .from("job_scopes")
    .delete()
    .eq("job_id", jobId);
  if (delErr) throw delErr;

  if (scopeIds.length === 0) return;

  const { error } = await supabase.from("job_scopes").insert(
    scopeIds.map((id) => ({ job_id: jobId, scope_id: id }))
  );
  if (error) throw error;
}

export async function getJobScopes(jobId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("job_scopes")
    .select("scope_id")
    .eq("job_id", jobId);

  if (error) throw error;
  return (data || []).map((x: any) => x.scope_id);
}

export async function listCustomerJobsByStatus(
  customerOrgId: string,
  status: "open" | "closed"
) {
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id,title,description,location,status,created_at,customer_id,deadline_date,visibility_mode"
    )
    .eq("customer_id", customerOrgId)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Job[];
}

export async function updateJobStatus(
  jobId: string,
  status: "open" | "closed"
) {
  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId);

  if (error) throw error;
}

export async function getJobById(jobId: string): Promise<Job> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) throw error;
  return data as Job;
}