"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { getMyCustomerOrg } from "../../../lib/customers";
import { listCustomerBidJobs, CustomerBidJobSummary } from "../../../lib/bids";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";

function formatMoney(v: number | null) {
  if (v === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export default function CustomerBidsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<CustomerBidJobSummary[]>([]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = await withErrorLogging(
        async () => {
          const profile = await getMyProfile();

          if (!profile) {
            router.replace("/login");
            return null;
          }

          if (profile.role !== "customer") {
            router.replace("/dashboard");
            return null;
          }

          const org = await getMyCustomerOrg();

          if (!org) {
            router.replace("/customer/settings");
            return null;
          }

          return await listCustomerBidJobs(org.id);
        },
        {
          message: "customer_bids_load_failed",
          code: "customer_bids_load_failed",
          source: "frontend",
          area: "bids",
          path: "/customer/bids",
          role: "customer",
        }
      );

      if (data) {
        setRows(data);
      }
    } catch {
      setErr("Unable to load bids. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
          Bids
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
          Review all jobs that already have bids. Open any job to compare
          contractor offers, pricing, schedule, and vendor readiness.
        </p>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading bids...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {!loading && !err && rows.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">No bids yet.</p>
        </section>
      ) : null}

      <section className="space-y-4">
        {rows.map((row) => (
          <section
            key={row.job_id}
            className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[#111827]">
                  {row.job_title}
                </h2>
                <div className="mt-2 text-sm text-[#4B5563]">
                  {row.job_location || "No location"}{" "}
                  {row.job_market ? `• ${row.job_market}` : ""}
                </div>
                <div className="mt-2 text-xs text-[#6B7280]">
                  Job ID: {row.job_id}
                </div>
              </div>

              <Link
                href={`/customer/bids/${row.job_id}`}
                className="inline-flex items-center justify-center rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
              >
                Open bids
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                  Bids
                </div>
                <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">
                  {row.bid_count}
                </div>
              </div>

              <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                  Lowest Bid
                </div>
                <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">
                  {formatMoney(row.lowest_bid)}
                </div>
              </div>

              <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                  Highest Bid
                </div>
                <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">
                  {formatMoney(row.highest_bid)}
                </div>
              </div>

              <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                  Job Status
                </div>
                <div className="mt-2 text-lg font-semibold text-[#111827] capitalize">
                  {row.job_status}
                </div>
              </div>

              <div className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                  Deadline
                </div>
                <div className="mt-2 text-lg font-semibold text-[#111827]">
                  {row.deadline_date || "—"}
                </div>
              </div>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}