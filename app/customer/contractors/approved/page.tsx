"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  COIRow,
  COIPolicyRow,
  listCOIPolicies,
  listCOIEndorsements,
  listInsuranceTypes,
  InsuranceTypeRow,
} from "../../../../lib/coi";

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

export default function CustomerApprovedContractorsPage() {
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
  const [endorseByCoi, setEndorseByCoi] = useState<Record<string, { codes: string[]; noticeDays: number | null }>>({});
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

      const it = await listInsuranceTypes();
      setInsuranceTypes(it);

      await searchApprovedCompanies("", cust.id);
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

  async function searchApprovedCompanies(query: string, customerId: string) {
    setErr(null);

    const like = query.trim();
    const q1 = like ? `%${like}%` : `%`;

    // 1) get approved links for this customer (and optionally filter by company name later)
    const { data: lnk, error: lnkErr } = await supabase
      .from("customer_contractors")
      .select("contractor_company_id,status")
      .eq("customer_id", customerId)
      .eq("status", "approved");

    if (lnkErr) throw lnkErr;

    const approvedIds = (lnk || []).map((r: any) => r.contractor_company_id);
    if (approvedIds.length === 0) {
      setCompanies([]);
      setLinks({});
      return;
    }

    // 2) load companies by ids + search query
    const { data: comps, error: compErr } = await supabase
      .from("contractor_companies")
      .select("id,legal_name,dba_name,status,block_reason")
      .in("id", approvedIds)
      .or(`legal_name.ilike.${q1},dba_name.ilike.${q1}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (compErr) throw compErr;

    const list = (comps || []) as ContractorCompanyRow[];
    setCompanies(list);

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
      await searchApprovedCompanies(q, customer.id);
    } catch (e: any) {
      setErr(e.message ?? "Search error");
    } finally {
      setLoading(false);
    }
  }

  function linkStatus(companyId: string) {
    return links[companyId]?.status ?? "not_added";
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
      window.open(json.url as string, "_blank");
    } catch (e: any) {
      setErr(e.message ?? "Download error");
    }
  }

  return (
    <main className="space-y-6">
      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="rounded border p-4 space-y-3">
        <div className="text-sm text-gray-600">Search approved contractors</div>
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
      </section>

      <section className="space-y-3">
        {companies.map((c) => {
          const st = linkStatus(c.id);
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
                  <div className="text-xs mt-1">Your status: <b className="capitalize">{st}</b></div>
                </div>

                <button className="rounded border px-3 py-1 text-sm" onClick={() => toggleCOI(c.id)}>
                  {isExpanded ? "Hide COI" : "View COI"}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-4 rounded border p-3 bg-gray-50 space-y-3">
                  {coiIsLoading && <div className="text-sm text-gray-600">Loading COI...</div>}
                  {!coiIsLoading && !coi && <div className="text-sm text-gray-600">No COI submitted.</div>}

                  {!coiIsLoading && coi && (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-gray-700">
                            Issue: <b>{iso(coi.issue_date) || "-"}</b> • Exp: <b>{iso(coi.expiration_date) || "-"}</b>
                          </div>
                          <div className="text-xs text-gray-700">
                            Carrier: <b>{coi.carrier_name || "-"}</b> • AM Best: <b>{coi.am_best_rating || "-"}</b> • Admitted:{" "}
                            <b>{coi.admitted_carrier ? "Yes" : "No"}</b>
                          </div>
                        </div>

                        <button
                          className="rounded bg-black px-3 py-1 text-sm text-white"
                          onClick={() => downloadCOIPdf(coi.id)}
                        >
                          Download PDF
                        </button>
                      </div>

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

                      <div className="rounded border bg-white p-3 space-y-2">
                        <div className="text-sm font-semibold">Policies</div>
                        {coiPolicies.length === 0 && <div className="text-xs text-gray-600">No policies recorded.</div>}

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

        {companies.length === 0 && !loading && <div className="text-sm text-gray-600">No approved contractors.</div>}
      </section>
    </main>
  );
}