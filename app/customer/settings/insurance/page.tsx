"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../../lib/profile";
import { supabase } from "../../../../lib/supabaseClient";

import { listInsuranceTypes, InsuranceType } from "../../../../lib/documents";
import {
  getMyCustomerOrg,
  listCustomerInsuranceReq,
  upsertCustomerInsuranceReq,
  CustomerOrg,
  CustomerInsuranceRequirement,
} from "../../../../lib/customers";

type CustomerInsuranceConfigRow = {
  id: string;
  customer_id: string;
  min_days_before_expiration: number | null;
  hard_block_if_expired: boolean | null;
  warning_days_before_expiration: number | null;
  min_am_best_rating: string | null;
  must_be_admitted_carrier: boolean | null;
  state_restrictions: string | null;
  bond_required: boolean | null;
  bid_bond: boolean | null;
  performance_bond: boolean | null;
  payment_bond: boolean | null;
  bond_amount_percent: number | null;
};

type EndorsementTypeRow = { code: string; name: string };

type CustomerRequiredEndorsementRow = {
  config_id: string;
  endorsement_code: string;
  notice_days: number | null;
};

function moneyToNumber(v: string) {
  const cleaned = v.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  return Number(cleaned);
}

export default function CustomerInsuranceSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [org, setOrg] = useState<CustomerOrg | null>(null);
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [insReq, setInsReq] = useState<CustomerInsuranceRequirement[]>([]);

  // config + endorsements
  const [cfg, setCfg] = useState<CustomerInsuranceConfigRow | null>(null);
  const [endorsementTypes, setEndorsementTypes] = useState<EndorsementTypeRow[]>([]);
  const [selectedEndorsements, setSelectedEndorsements] = useState<string[]>([]);
  const [noticeDays, setNoticeDays] = useState<number>(30);
  const [savingCfg, setSavingCfg] = useState(false);

  function getInsReqRow(insuranceTypeId: string) {
    return insReq.find((r) => r.insurance_type_id === insuranceTypeId) || null;
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const profile = await getMyProfile();
      if (!profile) return router.replace("/login");
      if (profile.role !== "customer") return router.replace("/dashboard");

      const o = await getMyCustomerOrg();
      if (!o) return router.replace("/customer/settings");
      setOrg(o);

      const it = await listInsuranceTypes();
      setInsuranceTypes(it);

      const ir = await listCustomerInsuranceReq(o.id);
      setInsReq(ir);

      // config
      const { data: cfgRow, error: cfgErr } = await supabase
        .from("customer_insurance_config")
        .select("*")
        .eq("customer_id", o.id)
        .maybeSingle();
      if (cfgErr) throw cfgErr;

      const cfgObj = (cfgRow ??
        ({
          id: "",
          customer_id: o.id,
          min_days_before_expiration: 0,
          hard_block_if_expired: true,
          warning_days_before_expiration: 30,
          min_am_best_rating: null,
          must_be_admitted_carrier: false,
          state_restrictions: null,
          bond_required: false,
          bid_bond: false,
          performance_bond: false,
          payment_bond: false,
          bond_amount_percent: null,
        } as any)) as CustomerInsuranceConfigRow;

      setCfg(cfgObj);

      // endorsement types
      const { data: et, error: etErr } = await supabase
        .from("endorsement_types")
        .select("code,name")
        .order("name", { ascending: true });
      if (etErr) throw etErr;
      setEndorsementTypes((et || []) as any);

      // selected endorsements (by config)
      if (cfgRow?.id) {
        const { data: reqEnd, error: reqEndErr } = await supabase
          .from("customer_required_endorsements")
          .select("endorsement_code,notice_days")
          .eq("config_id", cfgRow.id);
        if (reqEndErr) throw reqEndErr;

        const codes = (reqEnd || []).map((x: any) => x.endorsement_code);
        setSelectedEndorsements(codes);

        const nd = (reqEnd || [])[0]?.notice_days;
        if (typeof nd === "number") setNoticeDays(nd);
      } else {
        setSelectedEndorsements([]);
        setNoticeDays(30);
      }
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

  async function saveInsReq(insuranceTypeId: string, patch: Partial<CustomerInsuranceRequirement>) {
    if (!org) return;
    setErr(null);
    try {
      await upsertCustomerInsuranceReq(org.id, insuranceTypeId, patch);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Save insurance requirement error");
    }
  }

  function toggleEndorsement(code: string, checked: boolean) {
    setSelectedEndorsements((prev) => {
      if (checked) return prev.includes(code) ? prev : [...prev, code];
      return prev.filter((x) => x !== code);
    });
  }

  async function saveConfigAndEndorsements() {
    if (!org || !cfg) return;
    setSavingCfg(true);
    setErr(null);

    try {
      let savedCfgId = cfg.id || null;

      // 1) upsert config
      if (!cfg.id) {
        const { data: ins, error: insErr } = await supabase
          .from("customer_insurance_config")
          .insert({
            customer_id: org.id,
            min_days_before_expiration: cfg.min_days_before_expiration ?? 0,
            hard_block_if_expired: cfg.hard_block_if_expired ?? true,
            warning_days_before_expiration: cfg.warning_days_before_expiration ?? 30,
            min_am_best_rating: cfg.min_am_best_rating ?? null,
            must_be_admitted_carrier: cfg.must_be_admitted_carrier ?? false,
            state_restrictions: cfg.state_restrictions ?? null,
            bond_required: cfg.bond_required ?? false,
            bid_bond: cfg.bid_bond ?? false,
            performance_bond: cfg.performance_bond ?? false,
            payment_bond: cfg.payment_bond ?? false,
            bond_amount_percent: cfg.bond_amount_percent ?? null,
          })
          .select("*")
          .single();

        if (insErr) throw insErr;
        savedCfgId = (ins as any).id as string;
        setCfg(ins as any);
      } else {
        const { error: upErr } = await supabase
          .from("customer_insurance_config")
          .update({
            min_days_before_expiration: cfg.min_days_before_expiration ?? 0,
            hard_block_if_expired: cfg.hard_block_if_expired ?? true,
            warning_days_before_expiration: cfg.warning_days_before_expiration ?? 30,
            min_am_best_rating: cfg.min_am_best_rating ?? null,
            must_be_admitted_carrier: cfg.must_be_admitted_carrier ?? false,
            state_restrictions: cfg.state_restrictions ?? null,
            bond_required: cfg.bond_required ?? false,
            bid_bond: cfg.bid_bond ?? false,
            performance_bond: cfg.performance_bond ?? false,
            payment_bond: cfg.payment_bond ?? false,
            bond_amount_percent: cfg.bond_amount_percent ?? null,
          })
          .eq("id", cfg.id);

        if (upErr) throw upErr;
      }

      // 2) endorsements (delete + insert)
      if (!savedCfgId) throw new Error("Config id missing after save");

      const { error: delErr } = await supabase
        .from("customer_required_endorsements")
        .delete()
        .eq("config_id", savedCfgId);
      if (delErr) throw delErr;

      if (selectedEndorsements.length > 0) {
        const payload: CustomerRequiredEndorsementRow[] = selectedEndorsements.map((code) => ({
          config_id: savedCfgId!,
          endorsement_code: code,
          notice_days: noticeDays ?? null,
        }));

        const { error: insEndErr } = await supabase
          .from("customer_required_endorsements")
          .insert(payload);
        if (insEndErr) throw insEndErr;
      }

      alert("Saved insurance config");
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Save config error");
    } finally {
      setSavingCfg(false);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Insurance requirements</h1>
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

      {/* Insurance requirements */}
      <section className="rounded border p-4 space-y-3">
        <h2 className="font-semibold">Company insurance requirements (vendor pre-qualification)</h2>
        <p className="text-sm text-gray-600">
          Contractors can see these requirements. Admin will approve/reject vendor applications.
        </p>

        <div className="space-y-3">
          {insuranceTypes.map((it) => {
            const row = getInsReqRow(it.id);
            return (
              <div key={it.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <b>{it.name}</b>
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row?.is_required ?? true}
                      onChange={(e) => saveInsReq(it.id, { is_required: e.target.checked })}
                    />
                    Required
                  </label>
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border p-2"
                    placeholder="Min each occurrence (e.g. 1000000)"
                    defaultValue={row?.min_limit_each_occurrence ?? ""}
                    onBlur={(e) =>
                      saveInsReq(it.id, { min_limit_each_occurrence: moneyToNumber(e.target.value) as any })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    placeholder="Min aggregate (e.g. 2000000)"
                    defaultValue={row?.min_limit_aggregate ?? ""}
                    onBlur={(e) =>
                      saveInsReq(it.id, { min_limit_aggregate: moneyToNumber(e.target.value) as any })
                    }
                  />
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row?.require_additional_insured ?? false}
                      onChange={(e) => saveInsReq(it.id, { require_additional_insured: e.target.checked })}
                    />
                    Additional Insured
                  </label>

                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row?.require_blanket_additional_insured ?? false}
                      onChange={(e) =>
                        saveInsReq(it.id, { require_blanket_additional_insured: e.target.checked })
                      }
                    />
                    Blanket Additional Insured
                  </label>

                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row?.require_primary_noncontributory ?? false}
                      onChange={(e) =>
                        saveInsReq(it.id, { require_primary_noncontributory: e.target.checked })
                      }
                    />
                    Primary &amp; Non-contributory
                  </label>

                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row?.require_waiver_subrogation ?? false}
                      onChange={(e) => saveInsReq(it.id, { require_waiver_subrogation: e.target.checked })}
                    />
                    Waiver of subrogation
                  </label>
                </div>

                <textarea
                  className="mt-2 w-full rounded border p-2"
                  placeholder="Notes / exceptions"
                  defaultValue={row?.notes ?? ""}
                  onBlur={(e) => saveInsReq(it.id, { notes: e.target.value || null })}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Insurance config */}
      <section className="rounded border p-4 space-y-4">
        <h2 className="font-semibold">Insurance validation rules (enterprise)</h2>
        <p className="text-sm text-gray-600">
          These rules control warnings / blocks and insurer requirements for vendors working with you.
        </p>

        {!cfg ? (
          <div className="text-sm text-gray-600">Loading config...</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-gray-600">Minimum days before expiration</div>
                <input
                  className="w-full rounded border p-2"
                  value={cfg.min_days_before_expiration ?? 0}
                  onChange={(e) =>
                    setCfg({ ...cfg, min_days_before_expiration: Number(e.target.value || "0") })
                  }
                />
              </div>

              <div>
                <div className="text-xs text-gray-600">Warning days before expiration</div>
                <input
                  className="w-full rounded border p-2"
                  value={cfg.warning_days_before_expiration ?? 30}
                  onChange={(e) =>
                    setCfg({ ...cfg, warning_days_before_expiration: Number(e.target.value || "0") })
                  }
                />
              </div>

              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={!!cfg.hard_block_if_expired}
                  onChange={(e) => setCfg({ ...cfg, hard_block_if_expired: e.target.checked })}
                />
                Hard block if expired
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-gray-600">Minimum AM Best rating</div>
                <input
                  className="w-full rounded border p-2"
                  placeholder="e.g. A-"
                  value={cfg.min_am_best_rating ?? ""}
                  onChange={(e) => setCfg({ ...cfg, min_am_best_rating: e.target.value || null })}
                />
              </div>

              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={!!cfg.must_be_admitted_carrier}
                  onChange={(e) => setCfg({ ...cfg, must_be_admitted_carrier: e.target.checked })}
                />
                Must be admitted carrier
              </label>

              <div>
                <div className="text-xs text-gray-600">State restrictions</div>
                <input
                  className="w-full rounded border p-2"
                  placeholder="e.g. GA, FL"
                  value={cfg.state_restrictions ?? ""}
                  onChange={(e) => setCfg({ ...cfg, state_restrictions: e.target.value || null })}
                />
              </div>
            </div>

            <div className="rounded border p-3 space-y-3">
              <div className="font-semibold">Bond requirements</div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!cfg.bond_required}
                  onChange={(e) => setCfg({ ...cfg, bond_required: e.target.checked })}
                />
                Bond required
              </label>

              <div className="grid gap-2 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!cfg.bid_bond}
                    onChange={(e) => setCfg({ ...cfg, bid_bond: e.target.checked })}
                  />
                  Bid bond
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!cfg.performance_bond}
                    onChange={(e) => setCfg({ ...cfg, performance_bond: e.target.checked })}
                  />
                  Performance bond
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!cfg.payment_bond}
                    onChange={(e) => setCfg({ ...cfg, payment_bond: e.target.checked })}
                  />
                  Payment bond
                </label>
              </div>

              <div className="max-w-sm">
                <div className="text-xs text-gray-600">Bond amount %</div>
                <input
                  className="w-full rounded border p-2"
                  placeholder="e.g. 10"
                  value={cfg.bond_amount_percent ?? ""}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      bond_amount_percent: e.target.value.trim() === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="rounded border p-3 space-y-3">
              <div className="font-semibold">Required endorsements</div>

              <div className="grid gap-2 md:grid-cols-2">
                {endorsementTypes.map((e) => (
                  <label key={e.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEndorsements.includes(e.code)}
                      onChange={(ev) => toggleEndorsement(e.code, ev.target.checked)}
                    />
                    {e.name}
                  </label>
                ))}
              </div>

              <div className="max-w-sm">
                <div className="text-xs text-gray-600">Notice of Cancellation (days)</div>
                <input
                  className="w-full rounded border p-2"
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(Number(e.target.value || "0"))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="rounded bg-black px-4 py-2 text-white"
                onClick={saveConfigAndEndorsements}
                disabled={savingCfg}
              >
                {savingCfg ? "Saving..." : "Save insurance config"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}