import { supabase } from "./supabaseClient";

export type BidStatus =
  | "submitted"
  | "revision_requested"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type CustomerBidJobSummary = {
  job_id: string;
  job_title: string;
  job_location: string | null;
  job_market: string | null;
  job_status: string;
  deadline_date: string | null;
  bid_count: number;
  lowest_bid: number | null;
  highest_bid: number | null;
  latest_bid_at: string | null;
};

export type BidDetailRow = {
  id: string;
  job_id: string;
  company_id: string;
  team_id: string | null;
  price: number;
  message: string | null;
  review_notes: string | null;
  status: BidStatus;
  created_at: string;
  updated_at: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  work_days: number | null;
  reviewed_at: string | null;
  reviewed_by: string | null;

  contractor_legal_name: string;
  contractor_dba_name: string | null;
  contractor_status: string | null;

  team_name: string | null;

  vendor_status: string | null;
};

export type BidEventRow = {
  id: string;
  bid_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor_user_id: string | null;
  created_at: string;
};

export async function listCustomerBidJobs(customerId: string): Promise<CustomerBidJobSummary[]> {
  const { data: jobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("id,title,location,status,deadline_date")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (jobsErr) throw jobsErr;

  const jobIds = (jobs || []).map((j) => j.id);
  if (!jobIds.length) return [];

  const { data: bids, error: bidsErr } = await supabase
    .from("bids")
    .select("id,job_id,price,created_at")
    .in("job_id", jobIds);

  if (bidsErr) throw bidsErr;

  const marketByJob: Record<string, string | null> = {};
  for (const j of jobs || []) {
    const location = j.location || "";
    const parts = location.split(",").map((x: string) => x.trim()).filter(Boolean);
    marketByJob[j.id] = parts.length >= 2 ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}` : j.location;
  }

  return (jobs || [])
    .filter((j) => (bids || []).some((b) => b.job_id === j.id))
    .map((j) => {
      const jobBids = (bids || []).filter((b) => b.job_id === j.id);
      const prices = jobBids.map((b) => Number(b.price)).filter((n) => Number.isFinite(n));
      const latest = jobBids
        .map((b) => b.created_at)
        .sort((a, b) => (a < b ? 1 : -1))[0] ?? null;

      return {
        job_id: j.id,
        job_title: j.title,
        job_location: j.location,
        job_market: marketByJob[j.id] ?? null,
        job_status: j.status,
        deadline_date: j.deadline_date,
        bid_count: jobBids.length,
        lowest_bid: prices.length ? Math.min(...prices) : null,
        highest_bid: prices.length ? Math.max(...prices) : null,
        latest_bid_at: latest,
      };
    });
}

export async function listBidsForJob(jobId: string): Promise<BidDetailRow[]> {
  const { data: bids, error } = await supabase
    .from("bids")
    .select(`
      id,
      job_id,
      company_id,
      team_id,
      price,
      message,
      review_notes,
      status,
      created_at,
      updated_at,
      planned_start_date,
      planned_end_date,
      work_days,
      reviewed_at,
      reviewed_by
    `)
    .eq("job_id", jobId)
    .order("price", { ascending: true });

  if (error) throw error;
  if (!bids?.length) return [];

  const companyIds = [...new Set(bids.map((b) => b.company_id))];
  const teamIds = [...new Set(bids.map((b) => b.team_id).filter(Boolean))] as string[];

  const [{ data: companies, error: compErr }, { data: teams, error: teamErr }, { data: job, error: jobErr }] =
    await Promise.all([
      supabase
        .from("contractor_companies")
        .select("id,legal_name,dba_name,status")
        .in("id", companyIds),
      teamIds.length
        ? supabase.from("teams").select("id,name").in("id", teamIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("jobs").select("id,customer_id").eq("id", jobId).single(),
    ]);

  if (compErr) throw compErr;
  if (teamErr) throw teamErr;
  if (jobErr) throw jobErr;

  const { data: vendorRows, error: vendorErr } = await supabase
    .from("vendor_approvals")
    .select("contractor_company_id,status")
    .eq("customer_id", job.customer_id)
    .in("contractor_company_id", companyIds);

  if (vendorErr) throw vendorErr;

  const companyById = Object.fromEntries(
    (companies || []).map((c) => [c.id, c])
  );
  const teamById = Object.fromEntries(
    (teams || []).map((t) => [t.id, t])
  );
  const vendorByCompanyId = Object.fromEntries(
    (vendorRows || []).map((v) => [v.contractor_company_id, v.status])
  );

  return bids.map((b) => ({
    ...b,
    contractor_legal_name: companyById[b.company_id]?.legal_name ?? "Contractor",
    contractor_dba_name: companyById[b.company_id]?.dba_name ?? null,
    contractor_status: companyById[b.company_id]?.status ?? null,
    team_name: b.team_id ? teamById[b.team_id]?.name ?? null : null,
    vendor_status: vendorByCompanyId[b.company_id] ?? null,
  }));
}

export async function listBidEvents(bidId: string): Promise<BidEventRow[]> {
  const { data, error } = await supabase
    .from("bid_events")
    .select("*")
    .eq("bid_id", bidId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateBidStatus(
  bidId: string,
  nextStatus: BidStatus,
  reviewNotes?: string | null
) {
  const { data: bid, error: bidErr } = await supabase
    .from("bids")
    .select("id,status")
    .eq("id", bidId)
    .single();

  if (bidErr) throw bidErr;

  const { data: sess, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw sessErr;
  const userId = sess.session?.user?.id;
  if (!userId) throw new Error("Not logged in");

  const { error: updErr } = await supabase
    .from("bids")
    .update({
      status: nextStatus,
      review_notes: reviewNotes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq("id", bidId);

  if (updErr) throw updErr;

  const { error: evtErr } = await supabase.from("bid_events").insert({
    bid_id: bidId,
    event_type: "status_changed",
    from_status: bid.status,
    to_status: nextStatus,
    note: reviewNotes ?? null,
    actor_user_id: userId,
  });

  if (evtErr) throw evtErr;
}

export async function acceptBid(bidId: string) {
  const { data: bid, error: bidErr } = await supabase
    .from("bids")
    .select("id,job_id,company_id,team_id,price,status")
    .eq("id", bidId)
    .single();

  if (bidErr) throw bidErr;

  const { data: sess, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw sessErr;
  const userId = sess.session?.user?.id;
  if (!userId) throw new Error("Not logged in");

  const { error: acceptErr } = await supabase
    .from("bids")
    .update({
      status: "accepted",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    })
    .eq("id", bidId);

  if (acceptErr) throw acceptErr;

  const { error: rejectOthersErr } = await supabase
    .from("bids")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
      review_notes: "Another bid was accepted for this job.",
    })
    .eq("job_id", bid.job_id)
    .neq("id", bidId)
    .in("status", ["submitted", "revision_requested"]);

  if (rejectOthersErr) throw rejectOthersErr;

  const { error: awardErr } = await supabase.from("job_awards").upsert(
    {
      job_id: bid.job_id,
      bid_id: bid.id,
      contractor_company_id: bid.company_id,
      team_id: bid.team_id,
      awarded_price: bid.price,
      awarded_by: userId,
    },
    { onConflict: "job_id" }
  );

  if (awardErr) throw awardErr;

  const { error: jobErr } = await supabase
    .from("jobs")
    .update({ status: "open" })
    .eq("id", bid.job_id);

  if (jobErr) throw jobErr;

  const { error: evtErr } = await supabase.from("bid_events").insert([
    {
      bid_id: bid.id,
      event_type: "accepted",
      from_status: bid.status,
      to_status: "accepted",
      actor_user_id: userId,
    },
  ]);

  if (evtErr) throw evtErr;
}