"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import {
  applyToCustomer,
  listMyCustomerApplications,
  searchCustomers,
  CustomerMini,
  MyCustomerApplicationRow,
} from "../../../lib/contractor";

export default function ContractorCustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustomerMini[]>([]);

  const [apps, setApps] = useState<MyCustomerApplicationRow[]>([]);

  async function refreshApplications() {
    const a = await listMyCustomerApplications();
    setApps(a);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/login");

      const profile = await getMyProfile();
      if (!profile || profile.role !== "contractor") return router.replace("/dashboard");

      try {
        await refreshApplications();
      } catch (e: any) {
        setErr(e.message ?? "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function runSearch() {
    setErr(null);
    setSearching(true);
    try {
      const r = await searchCustomers(q);
      setResults(r);
    } catch (e: any) {
      setErr(e.message ?? "Search error");
    } finally {
      setSearching(false);
    }
  }

  async function apply(customerId: string) {
    setErr(null);
    try {
      await applyToCustomer(customerId);
      await refreshApplications();
    } catch (e: any) {
      setErr(e.message ?? "Apply failed");
    }
  }

  function statusFor(customerId: string) {
    const row = apps.find((x) => x.customer_id === customerId);
    return row?.status ?? null;
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <a className="underline text-sm" href="/contractor">Back</a>
      </div>

      {loading && <p className="text-sm text-gray-600">Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Search */}
      <div className="rounded border p-5 space-y-3">
        <div className="font-semibold">Find a customer and apply</div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Search by customer name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="rounded bg-black px-4 py-2 text-white"
            onClick={runSearch}
            disabled={!q.trim() || searching}
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-2 rounded border">
            {results.map((c) => {
              const st = statusFor(c.id);
              return (
                <div key={c.id} className="flex items-center justify-between border-b p-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    {c.description && <div className="text-sm text-gray-600">{c.description}</div>}
                    <div className="text-xs text-gray-500">Customer ID: {c.id}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {st && (
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                        {st.toUpperCase()}
                      </span>
                    )}

                    <button
                      className="rounded bg-black px-3 py-2 text-sm text-white"
                      onClick={() => apply(c.id)}
                      disabled={st === "approved" || st === "pending"}
                    >
                      {st === "approved" ? "Approved" : st === "pending" ? "Applied" : "Apply"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My applications */}
      <div className="rounded border p-5 space-y-3">
        <div className="font-semibold">My applications</div>

        {apps.length === 0 && <div className="text-sm text-gray-600">No applications yet.</div>}

        {apps.length > 0 && (
          <div className="rounded border">
            {apps.map((a) => {
              const cust = a.customers?.[0] ?? null;
              return (
                <div key={a.customer_id} className="flex items-center justify-between border-b p-3">
                  <div>
                    <div className="font-medium">{cust?.name ?? "Customer"}</div>
                    {cust?.description && <div className="text-sm text-gray-600">{cust.description}</div>}
                    <div className="text-xs text-gray-500">Customer ID: {a.customer_id}</div>
                  </div>

                  <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                    {a.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
