"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import {
  COIRow,
  COIPolicyRow,
  listCOIPolicies,
  listCOIEndorsements,
  listInsuranceTypes,
  InsuranceTypeRow,
} from "../../../lib/coi";

type ContractorCompanyRow = {
  id: string;
  legal_name: string;
  dba_name: string | null;
  status: string | null;
  block_reason: string | null;
};

type CustomerOrgRow = {
  id: string;
  owner_user_id: string;
  name: string;
};

type CustomerContractorLink = {
  contractor_company_id: string;
  status: "pending" | "approved" | "rejected" | string;
};

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

function iso(d: string | null | undefined) {
  return d ?? "";
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  const styles =
    tone === "success"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "warning"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "danger"
      ? "bg-red-50 text-red-700 border-red-200"
      : tone === "info"
      ? "bg-[#EAF3FF] text-[#0A2E5C] border-[#BFD7F2]"
      : "bg-[#F4F8FC] text-[#4B5563] border-[#D9E2EC]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

function relationshipTone(
  status: string
): "neutral" | "success" | "warning" | "danger" {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
}

export default function CustomerContractorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CustomerOrgRow | null>(null);

  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<ContractorCompanyRow[]>([]);
  const [links, setLinks] = useState<Record<string, CustomerContractorLink>>({});

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [coiByCompany, setCoiByCompany] = useState<Record<string, COIRow | null>>({});
  const [policiesByCoi, setPoliciesByCoi] = useState<Record<string, COIPolicyRow[]>>({});
  const [endorseByCoi, setEndorseByCoi] = useState<
    Record<string, { codes: string[]; noticeDays: number | null }>
  >({});
  const [coiLoading, setCoiLoading] = useState<Record<string, boolean>>({});

  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceTypeRow[]>([]);

  const insuranceNameById = useMemo(() => {
    const m: Record<string, string> = {};
    insuranceTypes.forEach((x) => {
      m[x.id] = x.name;
    });
    return m;
  }, [insuranceTypes]);

  async function loadBase() {
    setLoading(true);
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

      const { data: userData, error: userErr } = await supabase.auth.getSession();
      if (userErr) throw userErr;
      if (!userData.session?.user) {
        router.replace("/login");
        return;
      }

      const { data: cust, error: custErr } = await supabase
        .from("customers")
        .select("id,owner_user_id,name")
        .eq("owner_user_id", userData.session.user.id)
        .maybeSingle();

      if (custErr) throw custErr;

      if (!cust) {
        setErr("Customer org not found. Go to Settings and create it first.");
        setCustomer(null);
        return;
      }

      setCustomer(cust as CustomerOrgRow);

      const it = await listInsuranceTypes();
      setInsuranceTypes(it);

      await searchCompanies("", cust.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Load error";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchCompanies(query: string, customerId: string) {
    setErr(null);

    const like = query.trim();
    const q1 = like ? `%${like}%` : `%`;

    const { data: comps, error: compErr } = await supabase
      .from("contractor_companies")
      .select("id,legal_name,dba_name,status,block_reason")
      .or(`legal_name.ilike.${q1},dba_name.ilike.${q1}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (compErr) throw compErr;

    const list = (comps || []) as ContractorCompanyRow[];
    setCompanies(list);

    const ids = list.map((c) => c.id);
    if (ids.length === 0) {
      setLinks({});
      return;
    }

    const { data: lnk, error: lnkErr } = await supabase
      .from("customer_contractors")
      .select("contractor_company_id,status")
      .eq("customer_id", customerId)
      .in("contractor_company_id", ids);

    if (lnkErr) throw lnkErr;

    const map: Record<string, CustomerContractorLink> = {};
    (lnk || []).forEach((r: { contractor_company_id: string; status: string }) => {
      map[r.contractor_company_id] = {
        contractor_company_id: r.contractor_company_id,
        status: r.status,
      };
    });

    setLinks(map);
  }

  async function onSearch() {
    if (!customer) return;

    setLoading(true);
    try {
      await searchCompanies(q, customer.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Search error";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  function linkStatus(companyId: string) {
    return links[companyId]?.status ?? "not_added";
  }

  async function setContractorStatus(
    companyId: string,
    status: "approved" | "pending" | "rejected"
  ) {
    if (!customer) return;
    setErr(null);

    try {
      const { error } = await supabase.from("customer_contractors").upsert(
        {
          customer_id: customer.id,
          contractor_company_id: companyId,
          status,
        },
        { onConflict: "customer_id,contractor_company_id" }
      );

      if (error) throw error;

      await searchCompanies(q, customer.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update status error";
      setErr(message);
    }
  }

  async function toggleCOI(companyId: string) {
    const next = !expanded[companyId];
    setExpanded((p) => ({ ...p, [companyId]: next }));

    if (!next) return;
    if (coiByCompany[companyId] !== undefined) return;

    setCoiLoading((p) => ({ ...p, [companyId]: true }));
    setErr(null);

    try {
      const { data: coi, error: coiErr } = await supabase
        .from("contractor_coi")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (coiErr) throw coiErr;

      const coiRow = (coi ?? null) as COIRow | null;
      setCoiByCompany((p) => ({ ...p, [companyId]: coiRow }));

      if (coiRow?.id) {
        const [pol, end] = await Promise.all([
          listCOIPolicies(coiRow.id),
          listCOIEndorsements(coiRow.id),
        ]);

        setPoliciesByCoi((p) => ({ ...p, [coiRow.id]: pol }));
        setEndorseByCoi((p) => ({ ...p, [coiRow.id]: end }));
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load COI";
      setErr(message);
    } finally {
      setCoiLoading((p) => ({ ...p, [companyId]: false }));
    }
  }

  async function downloadCOIPdf(coiId: string) {
    setErr(null);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("No session token. Re-login.");

      const res = await fetch(`/api/coi/signed-url?coiId=${encodeURIComponent(coiId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await res.json()) as { error?: string; url?: string };
      if (!res.ok) throw new Error(json.error || "Failed to get signed url");
      if (!json.url) throw new Error("Signed URL was not returned.");

      window.open(json.url, "_blank");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Download error";
      setErr(message);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
          Manage Contractors
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
          Search contractors, review COI details, and manage your relationship
          status with each company.
        </p>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            className="flex-1 rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
            placeholder="Search contractor name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />

          <button
            className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:bg-[#9CA3AF]"
            onClick={onSearch}
            disabled={loading}
          >
            Search
          </button>
        </div>

        <p className="mt-3 text-xs text-[#6B7280]">
          You can review COI details for any contractor. PDF download becomes
          available after the contractor is approved by your organization.
        </p>
      </section>

      {companies.length === 0 && !loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">No contractors found.</p>
        </section>
      ) : null}

      <section className="space-y-4">
        {companies.map((c) => {
          const st = linkStatus(c.id);
          const isApproved = st === "approved";
          const isExpanded = !!expanded[c.id];
          const coi = coiByCompany[c.id];
          const coiIsLoading = !!coiLoading[c.id];

          const coiPolicies = coi?.id ? policiesByCoi[coi.id] || [] : [];
          const coiEnd = coi?.id ? endorseByCoi[coi.id] : null;

          return (
            <section
              key={c.id}
              className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-[#111827]">
                      {c.legal_name}
                    </h2>
                    <StatusPill tone={relationshipTone(st)}>
                      Your status: {st === "not_added" ? "not added" : st}
                    </StatusPill>
                    <StatusPill tone="info">
                      Company status: {c.status ?? "-"}
                    </StatusPill>
                  </div>

                  {c.dba_name ? (
                    <p className="mt-2 text-sm text-[#4B5563]">DBA: {c.dba_name}</p>
                  ) : null}

                  {c.block_reason ? (
                    <p className="mt-2 text-sm text-red-700">
                      Block reason: {c.block_reason}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <button
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    onClick={() => setContractorStatus(c.id, "pending")}
                  >
                    Add / Pending
                  </button>

                  <button
                    className="rounded-xl bg-[#1F6FB5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                    onClick={() => setContractorStatus(c.id, "approved")}
                  >
                    Approve
                  </button>

                  <button
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    onClick={() => setContractorStatus(c.id, "rejected")}
                  >
                    Reject
                  </button>

                  <button
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                    onClick={() => toggleCOI(c.id)}
                  >
                    {isExpanded ? "Hide COI" : "View COI"}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-6 rounded-2xl border border-[#E5EDF5] bg-[#FBFDFF] p-4">
                  {coiIsLoading ? (
                    <div className="text-sm text-[#4B5563]">Loading COI...</div>
                  ) : !coi ? (
                    <div className="text-sm text-[#4B5563]">
                      No COI submitted for this contractor.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#0A2E5C]">
                            COI Header
                          </h3>

                          <div className="mt-2 space-y-1 text-sm text-[#4B5563]">
                            <div>
                              Issue:{" "}
                              <span className="font-medium text-[#111827]">
                                {iso(coi.issue_date) || "-"}
                              </span>
                              {" · "}
                              Exp:{" "}
                              <span className="font-medium text-[#111827]">
                                {iso(coi.expiration_date) || "-"}
                              </span>
                            </div>
                            <div>
                              Carrier:{" "}
                              <span className="font-medium text-[#111827]">
                                {coi.carrier_name || "-"}
                              </span>
                              {" · "}
                              AM Best:{" "}
                              <span className="font-medium text-[#111827]">
                                {coi.am_best_rating || "-"}
                              </span>
                              {" · "}
                              Admitted:{" "}
                              <span className="font-medium text-[#111827]">
                                {coi.admitted_carrier ? "Yes" : "No"}
                              </span>
                            </div>
                            <div>
                              Status:{" "}
                              <span className="font-medium capitalize text-[#111827]">
                                {coi.status || "draft"}
                              </span>
                            </div>
                            {coi.review_notes ? (
                              <div>
                                Notes:{" "}
                                <span className="text-[#4B5563]">
                                  {coi.review_notes}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-2 lg:items-end">
                          <button
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                              isApproved
                                ? "bg-[#1F6FB5] text-white hover:bg-[#0A2E5C]"
                                : "cursor-not-allowed border border-[#D9E2EC] bg-white text-[#9CA3AF]"
                            }`}
                            disabled={!isApproved}
                            onClick={() => downloadCOIPdf(coi.id)}
                            title={
                              isApproved
                                ? "Download COI PDF"
                                : "Approve contractor to enable download"
                            }
                          >
                            Download PDF
                          </button>

                          {!isApproved ? (
                            <div className="text-xs text-[#6B7280]">
                              Download available after approval.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4">
                        <h4 className="text-sm font-semibold text-[#0A2E5C]">
                          Endorsements
                        </h4>

                        {coiEnd ? (
                          <>
                            <div className="mt-2 text-sm text-[#4B5563]">
                              Notice days:{" "}
                              <span className="font-medium text-[#111827]">
                                {coiEnd.noticeDays ?? "-"}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {coiEnd.codes.length > 0 ? (
                                coiEnd.codes.map((code) => (
                                  <span
                                    key={code}
                                    className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#374151]"
                                  >
                                    {code}
                                  </span>
                                ))
                              ) : (
                                <div className="text-sm text-[#4B5563]">
                                  No endorsements recorded.
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="mt-2 text-sm text-[#4B5563]">
                            No endorsements recorded.
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4">
                        <h4 className="text-sm font-semibold text-[#0A2E5C]">
                          Policies
                        </h4>

                        {coiPolicies.length === 0 ? (
                          <div className="mt-2 text-sm text-[#4B5563]">
                            No policies recorded.
                          </div>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {coiPolicies.map((p) => (
                              <div
                                key={p.id}
                                className="rounded-xl border border-[#D9E2EC] bg-[#FBFDFF] p-4"
                              >
                                <div className="text-sm font-semibold text-[#111827]">
                                  {insuranceNameById[p.insurance_type_id] ?? "Insurance"}
                                </div>

                                <div className="mt-1 text-xs text-[#6B7280]">
                                  Policy #{p.policy_number || "-"} {" · "}
                                  {iso(p.issue_date) || "-"} → {iso(p.expiration_date) || "-"}
                                </div>

                                <pre className="mt-3 overflow-auto rounded-xl border border-[#E5EDF5] bg-white p-3 text-xs text-[#374151]">
{JSON.stringify(p.limits ?? {}, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </section>
    </main>
  );
}