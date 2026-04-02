"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  listMarketplaceContractors,
  type MarketplaceContractor,
} from "../../../../lib/contractorMarketplace";
import {
  buildCustomerContractorBadgeMap,
  listMyApprovedContractorCompanyIds,
  listMyCustomerRequiredInsuranceNames,
  type ContractorBadgeMap,
} from "../../../../lib/customers";

function Badge({
  label,
  active,
  activeClassName,
}: {
  label: string;
  active: boolean;
  activeClassName: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        active
          ? activeClassName
          : "border-[#D9E2EC] bg-[#F8FAFC] text-[#6B7280]",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#F4F8FC] px-3 py-1 text-xs font-medium text-[#4B5563]">
      {children}
    </span>
  );
}

export default function CustomerAllContractorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<MarketplaceContractor[]>([]);
  const [badgeMap, setBadgeMap] = useState<ContractorBadgeMap>({});

  async function load(searchValue: string) {
    setLoading(true);
    setErr(null);

    try {
      console.log("[DEBUG][CustomerAllContractorsPage][marketplace] load:start", {
        searchValue,
      });

      const { data } = await supabase.auth.getSession();

      console.log("[DEBUG][CustomerAllContractorsPage][marketplace] session", {
        userId: data.session?.user?.id ?? null,
        email: data.session?.user?.email ?? null,
      });

      if (!data.session?.user) {
        console.warn(
          "[DEBUG][CustomerAllContractorsPage][marketplace] no session, redirect /login"
        );
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();

      console.log("[DEBUG][CustomerAllContractorsPage][marketplace] profile", profile);

      if (!profile || profile.role !== "customer") {
        console.warn(
          "[DEBUG][CustomerAllContractorsPage][marketplace] role is not customer, redirect /dashboard",
          profile?.role
        );
        router.replace("/dashboard");
        return;
      }

      const [marketplaceRows, approvedCompanyIds, requiredInsuranceNames] =
        await Promise.all([
          listMarketplaceContractors(searchValue),
          listMyApprovedContractorCompanyIds(),
          listMyCustomerRequiredInsuranceNames(),
        ]);

      console.log(
        "[DEBUG][CustomerAllContractorsPage][marketplace] data loaded",
        {
          marketplaceCount: marketplaceRows.length,
          marketplaceRows,
          approvedCompanyIds,
          requiredInsuranceNames,
        }
      );

      const contractorInsuranceByCompanyId: Record<string, string[]> = {};
      for (const row of marketplaceRows) {
        contractorInsuranceByCompanyId[row.company_id] = row.insurance_types || [];
      }

      const nextBadgeMap = buildCustomerContractorBadgeMap({
        marketplaceCompanyIds: marketplaceRows.map((row) => row.company_id),
        approvedCompanyIds,
        contractorInsuranceByCompanyId,
        requiredInsuranceNames,
      });

      console.log("[DEBUG][CustomerAllContractorsPage][marketplace] badge map", nextBadgeMap);

      setItems(marketplaceRows);
      setBadgeMap(nextBadgeMap);
      setAllowed(true);
    } catch (e: any) {
      console.error("[DEBUG][CustomerAllContractorsPage][marketplace] load:error", e);
      setErr(e.message ?? "Load error");
    } finally {
      console.log("[DEBUG][CustomerAllContractorsPage][marketplace] load:done");
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleItems = useMemo(() => items, [items]);

  useEffect(() => {
    console.log("[DEBUG][CustomerAllContractorsPage][marketplace] state snapshot", {
      loading,
      allowed,
      err,
      search,
      visibleItemsCount: visibleItems.length,
      visibleItems,
      badgeMap,
    });
  }, [loading, allowed, err, search, visibleItems, badgeMap]);

  if (loading || !allowed) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          {err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : (
            <p className="text-sm text-[#4B5563]">
              Loading marketplace contractors...
            </p>
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
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
                Browse all public marketplace contractors and quickly see who is
                verified on the platform, who already onboarded with you, and who
                matches your insurance requirements.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/customer/contractors/approved"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Approved only
              </Link>

              <Link
                href="/customer"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Back
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <label
                htmlFor="contractor-search"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Search contractors
              </label>
              <input
                id="contractor-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company name, DBA, or headline"
                className="w-full rounded-xl border border-[#D9E2EC] px-4 py-3 outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    load(search);
                  }
                }}
              />
            </div>

            <button
              onClick={() => load(search)}
              className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Search
            </button>
          </div>
        </section>

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        {visibleItems.length === 0 ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">No contractors found.</p>
          </section>
        ) : (
          <section className="grid gap-4">
            {visibleItems.map((item) => {
              const badges = badgeMap[item.company_id] || {
                portalVerified: false,
                onboardedWithYou: false,
                meetsYourRequirements: false,
              };

              return (
                <article
                  key={item.company_id}
                  className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#111827]">
                          {item.legal_name}
                        </h2>
                        {item.dba_name ? (
                          <span className="text-sm text-[#4B5563]">
                            DBA: {item.dba_name}
                          </span>
                        ) : null}
                      </div>

                      {item.headline ? (
                        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                          {item.headline}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge
                          label="Portal Verified"
                          active={badges.portalVerified}
                          activeClassName="border-blue-200 bg-blue-50 text-blue-700"
                        />
                        <Badge
                          label="Meets Your Requirements"
                          active={badges.meetsYourRequirements}
                          activeClassName="border-green-200 bg-green-50 text-green-700"
                        />
                        <Badge
                          label="Onboarded With You"
                          active={badges.onboardedWithYou}
                          activeClassName="border-violet-200 bg-violet-50 text-violet-700"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <InfoPill>
                          Available teams: {item.available_teams_count}
                        </InfoPill>
                        <InfoPill>
                          Rating: {item.average_rating} ({item.reviews_count})
                        </InfoPill>
                        <InfoPill>
                          Markets:{" "}
                          {item.markets.length > 0
                            ? item.markets.join(", ")
                            : "—"}
                        </InfoPill>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                          Approved insurance on file
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.insurance_types.length > 0 ? (
                            item.insurance_types.map((insurance) => (
                              <span
                                key={insurance}
                                className="inline-flex items-center rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#111827]"
                              >
                                {insurance}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[#6B7280]">
                              No approved insurance types found.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/customer/contractors/approved"
                        className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                      >
                        Review approved list
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}