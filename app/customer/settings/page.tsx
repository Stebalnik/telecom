"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { supabase } from "../../../lib/supabaseClient";
import { createMyCustomerOrg, getMyCustomerOrg, CustomerOrg } from "../../../lib/customers";

export default function CustomerSettingsHomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [org, setOrg] = useState<CustomerOrg | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();
      if (!profile) return router.replace("/login");
      if (profile.role !== "customer") return router.replace("/dashboard");

      const o = await getMyCustomerOrg();
      setOrg(o ?? null);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createOrg() {
    setErr(null);
    try {
      if (!orgName.trim()) throw new Error("Customer name is required.");
      await createMyCustomerOrg(orgName.trim(), orgDesc.trim() || null);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Create org error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customer settings</h1>
        <a className="underline" href="/customer">
          Back
        </a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!org && !loading && (
        <section className="rounded border p-4 space-y-3">
          <h2 className="font-semibold">Create your Customer org (one per account)</h2>
          <input
            className="w-full rounded border p-2"
            placeholder="Customer name (e.g., MasTec)"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
          <textarea
            className="w-full rounded border p-2"
            placeholder="Description (optional)"
            value={orgDesc}
            onChange={(e) => setOrgDesc(e.target.value)}
          />
          <button className="rounded bg-black px-4 py-2 text-white" onClick={createOrg}>
            Create
          </button>
        </section>
      )}

      {org && (
        <>
          <section className="rounded border p-4">
            <div className="text-sm text-gray-600">Org</div>
            <div className="text-lg font-semibold">{org.name}</div>
            {org.description && <div className="text-sm text-gray-700">{org.description}</div>}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <a className="rounded border p-5 hover:bg-gray-50" href="/customer/settings/insurance">
              <div className="text-lg font-semibold">Insurance requirements</div>
              <div className="text-sm text-gray-600 mt-1">
                Insurance limits, endorsements, expiration rules, bonds.
              </div>
            </a>

            <a className="rounded border p-5 hover:bg-gray-50" href="/customer/settings/certs-per-scope">
              <div className="text-lg font-semibold">Certs per scope requirements</div>
              <div className="text-sm text-gray-600 mt-1">
                Team certificate requirements per scope (min count in team).
              </div>
            </a>
          </section>
        </>
      )}
    </main>
  );
}