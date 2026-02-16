"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import {
  listCustomerContractorsByStatus,
  listLatestApprovedCoiByCompanies,
  searchContractorCompanies,
  upsertCustomerContractor,
  updateCustomerContractorStatus,
  removeCustomerContractor,
  ApprovedContractorRow,
  ContractorCompanyMini,
} from "../../../lib/customers";
import { openCoiSigned } from "../../../lib/coiDownload";

type Tab = "approved" | "pending" | "rejected";

export default function CustomerContractorsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("approved");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<ApprovedContractorRow[]>([]);
  const [coiMap, setCoiMap] = useState<Record<string, any>>({});

  // Search UI
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ContractorCompanyMini[]>([]);

  const companyIds = useMemo(
    () => rows.map((r) => r.contractor_company_id).filter(Boolean),
    [rows]
  );

  async function loadTab(t: Tab) {
    setLoading(true);
    setErr(null);
    try {
      const r = await listCustomerContractorsByStatus(t);
      setRows(r);

      if (t === "approved") {
        const ids = r.map((x) => x.contractor_company_id);
        const map = await listLatestApprovedCoiByCompanies(ids);
        setCoiMap(map);
      } else {
        setCoiMap({});
      }
    } catch (e: any) {
      setErr(e.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      // auth
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();
      if (!profile || profile.role !== "customer") {
        router.replace("/dashboard");
        return;
      }

      await loadTab("approved");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function runSearch() {
    setErr(null);
    setSearching(true);
    try {
      const res = await searchContractorCompanies(q);
      setSearchResults(res);
    } catch (e: any) {
      setErr(e.message ?? "Search error");
    } finally {
      setSearching(false);
    }
  }

  async function addOrApprove(companyId: string) {
    setErr(null);
    try {
      await upsertCustomerContractor({ contractor_company_id: companyId, status: "approved" });
      await loadTab(tab);
      setQ("");
      setSearchResults([]);
    } catch (e: any) {
      setErr(e.message ?? "Failed to approve");
    }
  }

  async function setStatus(companyId: string, status: Tab) {
    setErr(null);
    try {
      await updateCustomerContractorStatus(companyId, status);
      await loadTab(tab);
    } catch (e: any) {
      setErr(e.message ?? "Failed to update status");
    }
  }

  async function remove(companyId: string) {
    setErr(null);
    try {
      await removeCustomerContractor(companyId);
      await loadTab(tab);
    } catch (e: any) {
      setErr(e.message ?? "Failed to remove");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contractors</h1>
        <a className="underline text-sm" href="/customer">Back</a>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Search + Add */}
      <div className="rounded border p-5 space-y-3">
        <div className="font-semibold">Find and approve a contractor</div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Search by legal name or DBA…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="rounded bg-black px-4 py-2 text-white"
            onClick={runSearch}
            disabled={searching || !q.trim()}
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 rounded border">
            {searchResults.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b p-3">
                <div>
                  <div className="font-medium">{c.legal_name}</div>
                  {c.dba_name && <div className="text-sm text-gray-600">DBA: {c.dba_name}</div>}
                  <div className="text-xs text-gray-500">Company ID: {c.id}</div>
                </div>

                <button
                  className="rounded bg-black px-3 py-2 text-sm text-white"
                  onClick={() => addOrApprove(c.id)}
                >
                  Approve/Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["approved", "pending", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`rounded px-4 py-2 text-sm border ${tab === t ? "bg-black text-white" : "bg-white"}`}
            onClick={async () => {
              setTab(t);
              await loadTab(t);
            }}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded border">
        <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 p-3 text-sm font-medium">
          <div className="col-span-6">Company</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-4 text-right">Actions</div>
        </div>

        {loading && <div className="p-4 text-sm text-gray-600">Loading...</div>}

        {!loading && rows.length === 0 && (
          <div className="p-4 text-sm text-gray-600">No contractors in this list.</div>
        )}

        {!loading &&
          rows.map((r) => {
            const c = r.contractor_companies?.[0] ?? null;
            const coi = tab === "approved" ? (coiMap[r.contractor_company_id] || null) : null;

            return (
              <div key={r.contractor_company_id} className="grid grid-cols-12 gap-2 border-b p-3">
                <div className="col-span-6">
                  <div className="font-medium">{c?.legal_name ?? "Company"}</div>
                  {c?.dba_name && <div className="text-sm text-gray-600">DBA: {c.dba_name}</div>}
                  <div className="text-xs text-gray-500">Company ID: {r.contractor_company_id}</div>
                </div>

                <div className="col-span-2">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs">{r.status}</span>
                </div>

                <div className="col-span-4 flex flex-wrap justify-end gap-2">
                  {tab === "approved" && coi?.id && (
                    <button
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => openCoiSigned(coi.id)}
                    >
                      View COI
                    </button>
                  )}

                  {tab !== "approved" && (
                    <button
                      className="rounded bg-black px-3 py-2 text-sm text-white"
                      onClick={() => setStatus(r.contractor_company_id, "approved")}
                    >
                      Approve
                    </button>
                  )}

                  {tab !== "pending" && (
                    <button
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => setStatus(r.contractor_company_id, "pending")}
                    >
                      Pending
                    </button>
                  )}

                  {tab !== "rejected" && (
                    <button
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => setStatus(r.contractor_company_id, "rejected")}
                    >
                      Reject
                    </button>
                  )}

                  <button
                    className="rounded border px-3 py-2 text-sm"
                    onClick={() => remove(r.contractor_company_id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </main>
  );
}
