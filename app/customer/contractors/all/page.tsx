"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  listMarketplaceContractors,
  type MarketplaceContractor,
} from "../../../../lib/contractorMarketplace";

export default function CustomerAllContractorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<MarketplaceContractor[]>([]);

  async function load(searchValue: string) {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();

      if (!profile || profile.role !== "customer") {
        router.replace("/dashboard");
        return;
      }

      const rows = await listMarketplaceContractors(searchValue);
      setItems(rows);
      setAllowed(true);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !allowed) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          {err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : (
            <p className="text-sm text-[#4B5563]">Loading marketplace contractors...</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                All contractors
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Browse public contractor marketplace profiles. This page shows a
                short summary only.
              </p>
            </div>

            <Link
              href="/customer"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              className="w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              placeholder="Search by legal name, DBA, or headline"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  load(search);
                }
              }}
            />
            <button
              type="button"
              onClick={() => load(search)}
              className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Search
            </button>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">No contractors found.</p>
          </section>
        ) : (
          <section className="grid gap-4">
            {items.map((item) => (
              <div
                key={item.company_id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {item.legal_name}
                    </h2>

                    {item.dba_name ? (
                      <p className="mt-1 text-sm text-[#4B5563]">
                        DBA: {item.dba_name}
                      </p>
                    ) : null}

                    {item.headline ? (
                      <p className="mt-3 text-sm text-[#4B5563]">
                        {item.headline}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-[#6B7280]">
                        Available teams
                      </div>
                      <div className="mt-1 text-base font-semibold text-[#111827]">
                        {item.available_teams_count}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-[#6B7280]">
                        Rating
                      </div>
                      <div className="mt-1 text-base font-semibold text-[#111827]">
                        {Number(item.average_rating).toFixed(2)}
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        {item.reviews_count} reviews
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#6B7280]">
                      Markets
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.markets?.length ? (
                        item.markets.map((market) => (
                          <span
                            key={market}
                            className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-xs text-[#111827]"
                          >
                            {market}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-[#4B5563]">—</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-[#6B7280]">
                      Approved insurance
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.insurance_types?.length ? (
                        item.insurance_types.map((insurance) => (
                          <span
                            key={insurance}
                            className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-xs text-[#111827]"
                          >
                            {insurance}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-[#4B5563]">—</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href="/customer/contractors"
                    className="text-sm font-medium text-[#1F6FB5] hover:underline"
                  >
                    Open contractor management page
                  </Link>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}