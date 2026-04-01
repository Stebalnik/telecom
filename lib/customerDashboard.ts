import { supabase } from "./supabaseClient";
import { getMyProfile } from "./profile";

export type CustomerDashboardStats = {
  customerId: string;
  customerName: string;

  openJobs: number;
  jobsCloseToDeadline: number;
  jobsWithNoBids: number;

  bidsAwaitingReview: number;
  totalBids: number;

  approvedContractors: number;
  pendingContractorApprovals: number;

  attentionItems: number;
};

type CustomerOrgRow = {
  id: string;
  owner_user_id: string;
  name: string;
};

type JobRow = {
  id: string;
  status: string | null;
  deadline_date: string | null;
};

type BidRow = {
  id: string;
  job_id: string;
  status: string | null;
};

export async function getMyCustomerDashboardStats(): Promise<CustomerDashboardStats> {
  const profile = await getMyProfile();
  if (!profile) throw new Error("Not authenticated.");
  if (profile.role !== "customer") throw new Error("Customer access required.");

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;

  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("No active session.");

  const { data: customer, error: customerErr } = await supabase
    .from("customers")
    .select("id, owner_user_id, name")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (customerErr) throw customerErr;
  if (!customer) {
    throw new Error("Customer org not found. Go to Settings and create it first.");
  }

  const customerRow = customer as CustomerOrgRow;

  const [
    jobsRes,
    bidsRes,
    approvedContractorsRes,
    pendingContractorsRes,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id,status,deadline_date")
      .eq("customer_id", customerRow.id),

    supabase
      .from("bids")
      .select(`
        id,
        job_id,
        status,
        jobs!inner (
          customer_id
        )
      `)
      .eq("jobs.customer_id", customerRow.id),

    supabase
      .from("customer_contractors")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customerRow.id)
      .eq("status", "approved"),

    supabase
      .from("customer_contractors")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customerRow.id)
      .eq("status", "pending"),
  ]);

  if (jobsRes.error) throw jobsRes.error;
  if (bidsRes.error) throw bidsRes.error;
  if (approvedContractorsRes.error) throw approvedContractorsRes.error;
  if (pendingContractorsRes.error) throw pendingContractorsRes.error;

  const jobs = (jobsRes.data || []) as JobRow[];
  const bids = (bidsRes.data || []) as BidRow[];

  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 7);

  const openJobs = jobs.filter((j) => j.status === "open").length;

  const jobsCloseToDeadline = jobs.filter((j) => {
    if (!j.deadline_date) return false;
    const d = new Date(j.deadline_date);
    return j.status === "open" && d >= today && d <= soon;
  }).length;

  const bidCountByJob = new Map<string, number>();
  for (const bid of bids) {
    bidCountByJob.set(bid.job_id, (bidCountByJob.get(bid.job_id) || 0) + 1);
  }

  const jobsWithNoBids = jobs.filter((j) => j.status === "open" && !bidCountByJob.has(j.id)).length;

  const bidsAwaitingReview = bids.filter((b) => b.status === "submitted").length;
  const totalBids = bids.length;

  const approvedContractors = approvedContractorsRes.count ?? 0;
  const pendingContractorApprovals = pendingContractorsRes.count ?? 0;

  const attentionItems =
    bidsAwaitingReview +
    pendingContractorApprovals +
    jobsCloseToDeadline +
    jobsWithNoBids;

  return {
    customerId: customerRow.id,
    customerName: customerRow.name,
    openJobs,
    jobsCloseToDeadline,
    jobsWithNoBids,
    bidsAwaitingReview,
    totalBids,
    approvedContractors,
    pendingContractorApprovals,
    attentionItems,
  };
}