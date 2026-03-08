"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../../lib/profile";
import {
  getMyCustomerOrg,
  listCustomerScopeReq,
  listScopes,
  upsertCustomerScopeReq,
  deleteCustomerScopeReq,
  CustomerOrg,
  Scope,
  CustomerScopeRequirement,
} from "../../../../lib/customers";
import { listCertTypes, CertType } from "../../../../lib/documents";

export default function CustomerCertsPerScopeSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [org, setOrg] = useState<CustomerOrg | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [scopeReq, setScopeReq] = useState<CustomerScopeRequirement[]>([]);

  const certNameById = useMemo(() => {
    const m: Record<string, string> = {};
    certTypes.forEach((c) => {
      m[c.id] = c.name;
    });
    return m;
  }, [certTypes]);

  async function load() {
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

      const o = await getMyCustomerOrg();
      if (!o) {
        router.replace("/customer/settings");
        return;
      }

      setOrg(o);

      const [sc, ct, req] = await Promise.all([
        listScopes(),
        listCertTypes(),
        listCustomerScopeReq(o.id),
      ]);

      setScopes(sc);
      setCertTypes(ct);
      setScopeReq(req);
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

  async function addOrUpdateScopeReq(
    scopeId: string,
    certTypeId: string,
    minCount: number
  ) {
    if (!org) return;

    setErr(null);

    try {
      await upsertCustomerScopeReq({
        customer_id: org.id,
        scope_id: scopeId,
        cert_type_id: certTypeId,
        min_count_in_team: minCount,
        notes: null,
      });

      await load();
    } catch (e: any) {
      setErr(e.message ?? "Upsert scope requirement error");
    }
  }

  async function removeScopeReq(scopeId: string, certTypeId: string) {
    if (!org) return;

    setErr(null);

    try {
      await deleteCustomerScopeReq(org.id, scopeId, certTypeId);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Delete scope requirement error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Certs per scope requirements
          </h1>
          <div className="text-sm text-gray-600">Customer settings</div>
        </div>

        <div className="flex items-center gap-3">
          <a className="underline text-sm" href="/customer/settings">
            Back to settings
          </a>
          <a className="underline text-sm" href="/customer">
            Customer
          </a>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="rounded border p-4 space-y-3">
        <h2 className="font-semibold">Team requirements per scope</h2>
        <p className="text-sm text-gray-600">
          Example: scope=tower requires TTT-1 min 2 techs. Civil may not require
          TTT-1.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          {scopes.map((s) => {
            const items = scopeReq.filter((r) => r.scope_id === s.id);

            return (
              <div key={s.id} className="rounded border p-3">
                <b>{s.description || s.name}</b>

                {s.description &&
                  s.name &&
                  s.description !== s.name && (
                    <div className="mt-1 text-xs text-gray-500">
                      code: {s.name}
                    </div>
                  )}

                <div className="mt-2 space-y-2">
                  {items.map((r) => (
                    <div
                      key={r.cert_type_id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="text-sm">
                        {certNameById[r.cert_type_id] || r.cert_type_id} — min{" "}
                        <b>{r.min_count_in_team}</b>
                      </div>

                      <button
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => removeScopeReq(s.id, r.cert_type_id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-sm text-gray-600">
                      No requirements yet.
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2 rounded border p-2">
                  <div className="text-sm font-semibold">
                    Add / update requirement
                  </div>

                  <select
                    className="w-full rounded border p-2"
                    defaultValue=""
                    onChange={async (e) => {
                      const certId = e.target.value;
                      if (!certId) return;

                      const min = Number(
                        prompt(
                          "Minimum count in team for this certificate?",
                          "1"
                        ) || "1"
                      );

                      if (!min || min < 1) return;

                      await addOrUpdateScopeReq(s.id, certId, min);
                      e.currentTarget.value = "";
                    }}
                  >
                    <option value="">Select certificate...</option>
                    {certTypes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-gray-600">
                    After selecting a cert, you will be asked for min count.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}