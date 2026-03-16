"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMyProfile } from "../../../../lib/profile";
import { listBidsForJob, acceptBid, updateBidStatus, BidDetailRow } from "../../../../lib/bids";
import { supabase } from "../../../../lib/supabaseClient";

function formatMoney(v: number | null) {
  if (v === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function tone(status: string) {
  if (status === "accepted") return "bg-green-50 text-green-700 border-green-200";
  if (status === "revision_requested") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "rejected") return "bg-red-50 text-red-700 border-red-200";
  return "bg-[#EAF3FF] text-[#0A2E5C] border-[#BFD7F2]";
}

export default function CustomerBidJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = String(params.jobId);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string>("Job");
  const [rows, setRows] = useState<BidDetailRow[]>([]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();
      if (!profile) return router.replace("/login");
      if (profile.role !== "customer") return router.replace("/dashboard");

      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .select("id,title")
        .eq("id", jobId)
        .single();

      if (jobErr) throw jobErr;
      setJobTitle(job.title);

      const data = await listBidsForJob(jobId);
      setRows(data);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (jobId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const lowestBid = useMemo(() => {
    if (!rows.length) return null;
    return Math.min(...rows.map((r) => Number(r.price)));
  }, [rows]);

  async function onAccept(bidId: string) {
    try {
      setErr(null);
      if (!confirm("Accept this bid? Other open bids for this job will be rejected.")) return;
      await acceptBid(bidId);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Accept error");
    }
  }

  async function onReject(bidId: string) {
    try {
      setErr(null);
      await updateBidStatus(bidId, "rejected", "Rejected by customer.");
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Reject error");
    }
  }

  async function onRevision(bidId: string) {
    const note = window.prompt("Enter revision request note:");
    if (note === null) return;

    try {
      setErr(null);
      await updateBidStatus(bidId, "revision_requested", note || "Revision requested.");
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Revision request error");
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              {jobTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#4B5563]">
              Compare bids for this job and choose the best contractor offer.
            </p>
            <div className="mt-2 text-xs text-[#6B7280]">Job ID: {jobId}</div>
          </div>

          <Link
            href="/customer/bids"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Back to bids
          </Link>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading job bids...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">Total Bids</div>
            <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">{rows.length}</div>
          </div>
          <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">Lowest Bid</div>
            <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">{formatMoney(lowestBid)}</div>
          </div>
        </section>
      ) : null}

      {!loading && rows.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">No bids for this job yet.</p>
        </section>
      ) : null}

      <section className="space-y-4">
        {rows.map((row) => (
          <section
            key={row.id}
            className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#111827]">
                    {row.contractor_legal_name}
                  </h2>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone(row.status)}`}>
                    {row.status}
                  </span>
                  {row.price === lowestBid ? (
                    <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      Lowest bid
                    </span>
                  ) : null}
                </div>

                {row.contractor_dba_name ? (
                  <p className="mt-2 text-sm text-[#4B5563]">DBA: {row.contractor_dba_name}</p>
                ) : null}

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                    <div className="text-xs text-[#4B5563]">Bid Price</div>
                    <div className="mt-1 text-lg font-semibold text-[#0A2E5C]">{formatMoney(row.price)}</div>
                  </div>
                  <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                    <div className="text-xs text-[#4B5563]">Planned Start</div>
                    <div className="mt-1 text-sm font-semibold text-[#111827]">{row.planned_start_date || "—"}</div>
                  </div>
                  <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                    <div className="text-xs text-[#4B5563]">Planned End</div>
                    <div className="mt-1 text-sm font-semibold text-[#111827]">{row.planned_end_date || "—"}</div>
                  </div>
                  <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                    <div className="text-xs text-[#4B5563]">Work Days</div>
                    <div className="mt-1 text-sm font-semibold text-[#111827]">{row.work_days ?? "—"}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-[#4B5563]">
                  <div>Team: <span className="font-medium text-[#111827]">{row.team_name || "—"}</span></div>
                  <div>Company status: <span className="font-medium text-[#111827]">{row.contractor_status || "—"}</span></div>
                  <div>Vendor status: <span className="font-medium text-[#111827]">{row.vendor_status || "—"}</span></div>
                  <div>Submitted: <span className="font-medium text-[#111827]">{row.created_at}</span></div>
                </div>

                {row.message ? (
                  <div className="mt-4 rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                    <div className="text-sm font-semibold text-[#0A2E5C]">Contractor message</div>
                    <p className="mt-2 text-sm leading-6 text-[#374151]">{row.message}</p>
                  </div>
                ) : null}

                {row.review_notes ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-800">Review notes</div>
                    <p className="mt-2 text-sm leading-6 text-amber-900">{row.review_notes}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 xl:w-[220px] xl:justify-end">
                <button
                  className="rounded-xl bg-[#1F6FB5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                  onClick={() => onAccept(row.id)}
                >
                  Accept
                </button>

                <button
                  className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                  onClick={() => onRevision(row.id)}
                >
                  Request revision
                </button>

                <button
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  onClick={() => onReject(row.id)}
                >
                  Reject
                </button>
              </div>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
