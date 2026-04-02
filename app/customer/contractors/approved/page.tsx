"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  listApprovedCustomerContractorsDetailed,
  type ApprovedContractorRow,
} from "../../../../lib/customers";
import {
  type COIRow,
  type COIPolicyRow,
  type InsuranceTypeRow,
  listCOIEndorsements,
  listCOIPolicies,
  listInsuranceTypes,
} from "../../../../lib/coi";

type EndorsementView = {
  codes: string[];
  noticeDays: number | null;
};

function iso(value: string | null | undefined) {
  return value ?? "—";
}

function CompanyStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized = (status || "").toLowerCase();

  const cls =
    normalized === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalized === "blocked"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${cls}`}
    >
      {status || "unknown"}
    </span>
  );
}

export default function CustomerApprovedContractorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ApprovedContractorRow[]>([]);
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceTypeRow[]>([]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [coiLoading, setCoiLoading] = useState<Record<string, boolean>>({});
  const [coiByCompany, setCoiByCompany] = useState<Record<string, COIRow | null>>(
    {}
  );
  const [policiesByCoi, setPoliciesByCoi] = useState<
    Record<string, COIPolicyRow[]>
  >({});
  const [endorsementsByCoi, setEndorsementsByCoi] = useState<
    Record<string, EndorsementView>
  >({});

  const insuranceNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of insuranceTypes) {
      map[item.id] = item.name;
    }
    return map;
  }, [insuranceTypes]);

  async function loadPage(showFullLoader = true) {
    if (showFullLoader) setLoading(true);
    else setRefreshing(true);

    setErr(null);

    try {
      const profile = await getMyProfile();

      if (!profile) {
        router.replace("/login");
        return;
      }

      if (profile.role !== "customer") {
        router.replace("/dashboard");
        return;
      }

      const [approvedRows, insuranceRows] = await Promise.all([
        listApprovedCustomerContractorsDetailed(),
        listInsuranceTypes(),
      ]);

      setRows(approvedRows);
      setInsuranceTypes(insuranceRows);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      if (showFullLoader) setLoading(false);
      else setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPage(true);

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadPage(false);
      }, 250);
    };

    const channel = supabase
      .channel("customer-approved-contractors-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_contractors" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((row) => {
      const company = row.contractor_companies;
      const legal = company?.legal_name?.toLowerCase() || "";
      const dba = company?.dba_name?.toLowerCase() || "";

      return legal.includes(needle) || dba.includes(needle);
    });
  }, [q, rows]);

  async function toggleCOI(companyId: string) {
    const next = !expanded[companyId];
    setExpanded((prev) => ({ ...prev, [companyId]: next }));

    if (!next) return;
    if (coiByCompany[companyId] !== undefined) return;

    setCoiLoading((prev) => ({ ...prev, [companyId]: true }));
    setErr(null);

    try {
      const { data, error } = await supabase
        .from("contractor_coi")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const coiRow = ((data || [])[0] ?? null) as COIRow | null;

      setCoiByCompany((prev) => ({
        ...prev,
        [companyId]: coiRow,
      }));

      if (coiRow?.id) {
        const [policies, endorsements] = await Promise.all([
          listCOIPolicies(coiRow.id),
          listCOIEndorsements(coiRow.id),
        ]);

        setPoliciesByCoi((prev) => ({
          ...prev,
          [coiRow.id]: policies,
        }));

        setEndorsementsByCoi((prev) => ({
          ...prev,
          [coiRow.id]: endorsements,
        }));
      }
    } catch (e: any) {
      setErr(e.message ?? "Failed to load COI");
    } finally {
      setCoiLoading((prev) => ({ ...prev, [companyId]: false }));
    }
  }

  async function downloadCOIPdf(coiId: string) {
    setErr(null);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      if (!token) throw new Error("No session token. Re-login.");

      const res = await fetch(
        `/api/coi/signed-url?coiId=${encodeURIComponent(coiId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to get signed url");
      }

      window.open(json.url as string, "_blank");
    } catch (e: any) {
      setErr(e.message ?? "Download error");
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
            Approved Contractors
          </h1>
          <p className="mt-2 text-sm text-[#4B5563]">
            Loading approved contractors...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Approved Contractors
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              View contractors already approved for your company and review
              their COI details.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/customer/contractors/all"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Browse All Contractors
            </Link>

            <Link
              href="/customer"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <div className="text-sm text-[#4B5563]">Approved contractors</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">
            {rows.length}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-2">
          <label className="block text-sm font-medium text-[#111827]">
            Search
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
            placeholder="Search by legal name or DBA..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {refreshing ? (
            <div className="mt-2 text-xs text-[#4B5563]">Refreshing...</div>
          ) : null}
        </div>
      </section>

      {filteredRows.length === 0 ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">
            {rows.length === 0
              ? "No approved contractors yet."
              : "No approved contractors match your search."}
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredRows.map((row) => {
            const company = row.contractor_companies;
            if (!company) return null;

            const isExpanded = !!expanded[company.id];
            const coi = coiByCompany[company.id];
            const coiIsLoading = !!coiLoading[company.id];
            const policies = coi?.id ? policiesByCoi[coi.id] || [] : [];
            const endorsements = coi?.id
              ? endorsementsByCoi[coi.id]
              : null;

            return (
              <article
                key={company.id}
                className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-[#111827]">
                        {company.legal_name}
                      </h2>
                      <CompanyStatusBadge status={company.status} />
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-[#4B5563]">
                      <div>DBA: {company.dba_name || "—"}</div>
                      <div>
                        Your relationship:{" "}
                        <span className="font-medium capitalize text-[#111827]">
                          {row.status}
                        </span>
                      </div>
                      {company.block_reason ? (
                        <div className="text-red-700">
                          Block reason: {company.block_reason}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCOI(company.id)}
                      className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    >
                      {isExpanded ? "Hide COI" : "View COI"}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-5 rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                    {coiIsLoading ? (
                      <div className="text-sm text-[#4B5563]">
                        Loading COI...
                      </div>
                    ) : !coi ? (
                      <div className="text-sm text-[#4B5563]">
                        No COI submitted.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                                Issue date
                              </div>
                              <div className="mt-1 text-sm font-medium text-[#111827]">
                                {iso(coi.issue_date)}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                                Expiration date
                              </div>
                              <div className="mt-1 text-sm font-medium text-[#111827]">
                                {iso(coi.expiration_date)}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                                Carrier
                              </div>
                              <div className="mt-1 text-sm font-medium text-[#111827]">
                                {coi.carrier_name || "—"}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                                AM Best / Admitted
                              </div>
                              <div className="mt-1 text-sm font-medium text-[#111827]">
                                {coi.am_best_rating || "—"} /{" "}
                                {coi.admitted_carrier ? "Yes" : "No"}
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => downloadCOIPdf(coi.id)}
                              className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                            >
                              Download PDF
                            </button>
                          </div>
                        </div>

                        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-4">
                          <h3 className="text-sm font-semibold text-[#111827]">
                            Endorsements
                          </h3>

                          {endorsements && endorsements.codes.length > 0 ? (
                            <>
                              <div className="mt-2 text-xs text-[#4B5563]">
                                Notice days:{" "}
                                <span className="font-medium text-[#111827]">
                                  {endorsements.noticeDays ?? "—"}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {endorsements.codes.map((code) => (
                                  <span
                                    key={code}
                                    className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#111827]"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="mt-2 text-sm text-[#4B5563]">
                              No endorsements recorded.
                            </div>
                          )}
                        </section>

                        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-4">
                          <h3 className="text-sm font-semibold text-[#111827]">
                            Policies
                          </h3>

                          {policies.length === 0 ? (
                            <div className="mt-2 text-sm text-[#4B5563]">
                              No policies recorded.
                            </div>
                          ) : (
                            <div className="mt-3 grid gap-3">
                              {policies.map((policy) => (
                                <div
                                  key={policy.id}
                                  className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4"
                                >
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                      <div className="text-sm font-semibold text-[#111827]">
                                        {insuranceNameById[
                                          policy.insurance_type_id
                                        ] ?? "Insurance"}
                                      </div>
                                      <div className="mt-1 text-xs text-[#4B5563]">
                                        Policy #{policy.policy_number || "—"} •{" "}
                                        {iso(policy.issue_date)} →{" "}
                                        {iso(policy.expiration_date)}
                                      </div>
                                    </div>
                                  </div>

                                  <pre className="mt-3 overflow-auto rounded-2xl bg-[#F8FAFC] p-3 text-xs text-[#111827]">
{JSON.stringify(policy.limits ?? {}, null, 2)}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}