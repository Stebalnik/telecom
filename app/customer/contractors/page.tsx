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

function iso(d: string | null | undefined) {
  return d ?? "";
}

export default function CustomerContractorsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CustomerOrgRow | null>(null);

  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<ContractorCompanyRow[]>([]);
  const [links, setLinks] = useState<Record<string, CustomerContractorLink>>({});

  // COI view state per contractor
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [coiByCompany, setCoiByCompany] = useState<Record<string, COIRow | null>>({});
  const [policiesByCoi, setPoliciesByCoi] = useState<Record<string, COIPolicyRow[]>>({});
  const [endorseByCoi, setEndorseByCoi] = useState<Record<string, { codes: string[]; noticeDays: number | null }>>(
    {}
  );
  const [coiLoading, setCoiLoading] = useState<Record<string, boolean>>({});

  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceTypeRow[]>([]);
  const insuranceNameById = useMemo(() => {
    const m: Record<string, string> = {};
    insuranceTypes.forEach((x) => (m[x.id] = x.name));
    return m;
  }, [insuranceTypes]);

  async function loadBase() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();
      if (!profile) return router.replace("/login");
      if (profile.role !== "customer") return router.replace("/dashboard");

      // load customer org by owner_user_id
      const { data: userData, error: userErr } = await supabase.auth.getSession();
      if (userErr) throw userErr;
      if (!userData.session?.user) return router.replace("/login");

      const { data: cust, error: custErr } = await supabase
        .from("customers")
        .select("id,owner_user_id,name")
        .eq("owner_user_id", userData.session?.user.id)
        .maybeSingle();

      if (custErr) throw custErr;
      if (!cust) {
        setErr("Customer org not found. Go to Settings and create it first.");
        setCustomer(null);
        setLoading(false);
        return;
      }
      setCustomer(cust as CustomerOrgRow);

      // insurance types for COI policy labels
      const it = await listInsuranceTypes();
      setInsuranceTypes(it);

      // initial search load
      await searchCompanies("", cust.id);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
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

    // show latest first; simple search by legal_name / dba_name
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

    // pull link statuses for these companies for this customer
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
    (lnk || []).forEach((r: any) => {
      map[r.contractor_company_id] = { contractor_company_id: r.contractor_company_id, status: r.status };
    });
    setLinks(map);
  }

  async function onSearch() {
    if (!customer) return;
    setLoading(true);
    try {
      await searchCompanies(q, customer.id);
    } catch (e: any) {
      setErr(e.message ?? "Search error");
    } finally {
      setLoading(false);
    }
  }

  function linkStatus(companyId: string) {
    return links[companyId]?.status ?? "not_added";
  }

  async function setContractorStatus(companyId: string, status: "approved" | "pending" | "rejected") {
    if (!customer) return;
    setErr(null);

    try {
      // upsert link row
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
    } catch (e: any) {
      setErr(e.message ?? "Update status error");
    }
  }

  async function toggleCOI(companyId: string) {
    const next = !expanded[companyId];
    setExpanded((p) => ({ ...p, [companyId]: next }));

    if (!next) return; // collapsing
    if (coiByCompany[companyId] !== undefined) return; // already loaded (including null)

    setCoiLoading((p) => ({ ...p, [companyId]: true }));
    setErr(null);

    try {
      // load latest COI for this company
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
        const [pol, end] = await Promise.all([listCOIPolicies(coiRow.id), listCOIEndorsements(coiRow.id)]);
        setPoliciesByCoi((p) => ({ ...p, [coiRow.id]: pol }));
        setEndorseByCoi((p) => ({ ...p, [coiRow.id]: end }));
      }
    } catch (e: any) {
      setErr(e.message ?? "Failed to load COI");
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
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to get signed url");
      const url = json.url as string;
      window.open(url, "_blank");
    } catch (e: any) {
      setErr(e.message ?? "Download error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contractors</h1>
        <a className="underline text-sm" href="/customer">
          Back
        </a>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="rounded border p-4 space-y-3">
        <div className="text-sm text-gray-600">Search contractors</div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border p-2"
            placeholder="Type contractor name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
          <button className="rounded bg-black px-4 py-2 text-white" onClick={onSearch} disabled={loading}>
            Search
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Customer can view COI details of any contractor. Download PDF is available only after you approve the contractor.
        </div>
      </section>

      <section className="space-y-3">
        {companies.map((c) => {
          const st = linkStatus(c.id);
          const isApproved = st === "approved";
          const isExpanded = !!expanded[c.id];
          const coi = coiByCompany[c.id];
          const coiIsLoading = !!coiLoading[c.id];

          const coiPolicies = coi?.id ? policiesByCoi[coi.id] || [] : [];
          const coiEnd = coi?.id ? endorseByCoi[coi.id] : null;

          return (
            <div key={c.id} className="rounded border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{c.legal_name}</div>
                  {c.dba_name && <div className="text-sm text-gray-600">DBA: {c.dba_name}</div>}
                  <div className="text-xs text-gray-500 mt-1">Company status: {c.status ?? "-"}</div>
                  {c.block_reason && <div className="text-xs text-red-600">Block reason: {c.block_reason}</div>}
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <div className="text-xs">
                    Your status:{" "}
                    <b className="capitalize">
                      {st === "not_added" ? "not added" : st}
                    </b>
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      className="rounded border px-3 py-1 text-sm"
                      onClick={() => setContractorStatus(c.id, "pending")}
                    >
                      Add / Pending
                    </button>
                    <button
                      className="rounded bg-black px-3 py-1 text-sm text-white"
                      onClick={() => setContractorStatus(c.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded border px-3 py-1 text-sm"
                      onClick={() => setContractorStatus(c.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>

                  <button
                    className="rounded border px-3 py-1 text-sm"
                    onClick={() => toggleCOI(c.id)}
                  >
                    {isExpanded ? "Hide COI" : "View COI"}
                  </button>
                </div>
              </div>

              {/* COI panel */}
              {isExpanded && (
                <div className="mt-4 rounded border p-3 bg-gray-50 space-y-3">
                  {coiIsLoading && <div className="text-sm text-gray-600">Loading COI...</div>}

                  {!coiIsLoading && !coi && (
                    <div className="text-sm text-gray-600">No COI submitted for this contractor.</div>
                  )}

                  {!coiIsLoading && coi && (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm">
                            <b>COI header</b>
                          </div>
                          <div className="text-xs text-gray-700">
                            Issue: <b>{iso(coi.issue_date) || "-"}</b> • Exp: <b>{iso(coi.expiration_date) || "-"}</b>
                          </div>
                          <div className="text-xs text-gray-700">
                            Carrier: <b>{coi.carrier_name || "-"}</b> • AM Best: <b>{coi.am_best_rating || "-"}</b> • Admitted:{" "}
                            <b>{coi.admitted_carrier ? "Yes" : "No"}</b>
                          </div>
                          <div className="text-xs text-gray-700">
                            Status: <b className="capitalize">{coi.status || "draft"}</b>
                            {coi.review_notes ? (
                              <>
                                {" "}• Notes: <span className="text-gray-600">{coi.review_notes}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            className={`rounded px-3 py-1 text-sm ${
                              isApproved ? "bg-black text-white" : "border text-gray-500"
                            }`}
                            disabled={!isApproved}
                            onClick={() => downloadCOIPdf(coi.id)}
                            title={isApproved ? "Download COI PDF" : "Approve contractor to enable download"}
                          >
                            Download PDF
                          </button>
                          {!isApproved && (
                            <div className="text-xs text-gray-500">
                              Download доступен после approval
                            </div>
                          )}
                        </div>
                      </div>

                      {/* endorsements */}
                      <div className="rounded border bg-white p-3">
                        <div className="text-sm font-semibold">Endorsements</div>
                        {coiEnd ? (
                          <>
                            <div className="text-xs text-gray-600 mt-1">
                              Notice days: <b>{coiEnd.noticeDays ?? "-"}</b>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {coiEnd.codes.length > 0 ? (
                                coiEnd.codes.map((code) => (
                                  <span key={code} className="text-xs rounded border px-2 py-1">
                                    {code}
                                  </span>
                                ))
                              ) : (
                                <div className="text-xs text-gray-600">No endorsements recorded.</div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-600">No endorsements recorded.</div>
                        )}
                      </div>

                      {/* policies */}
                      <div className="rounded border bg-white p-3 space-y-2">
                        <div className="text-sm font-semibold">Policies</div>
                        {coiPolicies.length === 0 && (
                          <div className="text-xs text-gray-600">No policies recorded.</div>
                        )}

                        {coiPolicies.map((p) => (
                          <div key={p.id} className="rounded border p-2">
                            <div className="text-sm">
                              <b>{insuranceNameById[p.insurance_type_id] ?? "Insurance"}</b>
                            </div>
                            <div className="text-xs text-gray-600">
                              Policy #{p.policy_number || "-"} • {iso(p.issue_date) || "-"} → {iso(p.expiration_date) || "-"}
                            </div>
                            <pre className="mt-2 text-xs bg-gray-50 rounded p-2 overflow-auto">
{JSON.stringify(p.limits ?? {}, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {companies.length === 0 && !loading && (
          <div className="text-sm text-gray-600">No contractors found.</div>
        )}
      </section>
    </main>
  );
}