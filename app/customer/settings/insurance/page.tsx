"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [org, setOrg] = useState<CustomerOrg | null>(null);
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [insReq, setInsReq] = useState<CustomerInsuranceRequirement[]>([]);

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
    setSaveMsg(null);

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

      const it = await listInsuranceTypes();
      setInsuranceTypes(it);

      const ir = await listCustomerInsuranceReq(o.id);
      setInsReq(ir);

      const { data: cfgRow, error: cfgErr } = await supabase
        .from("customer_insurance_config")
        .select("*")
        .eq("customer_id", o.id)
        .maybeSingle();

      if (cfgErr) throw cfgErr;

      const cfgObj: CustomerInsuranceConfigRow =
        (cfgRow as CustomerInsuranceConfigRow | null) ?? {
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
        };

      setCfg(cfgObj);

      const { data: et, error: etErr } = await supabase
        .from("endorsement_types")
        .select("code,name")
        .order("name", { ascending: true });

      if (etErr) throw etErr;
      setEndorsementTypes((et || []) as EndorsementTypeRow[]);

      if (cfgRow?.id) {
        const { data: reqEnd, error: reqEndErr } = await supabase
          .from("customer_required_endorsements")
          .select("endorsement_code,notice_days")
          .eq("config_id", cfgRow.id);

        if (reqEndErr) throw reqEndErr;

        const typedReqEnd = (reqEnd || []) as {
          endorsement_code: string;
          notice_days: number | null;
        }[];

        setSelectedEndorsements(typedReqEnd.map((x) => x.endorsement_code));

        const nd = typedReqEnd[0]?.notice_days;
        if (typeof nd === "number") {
          setNoticeDays(nd);
        } else {
          setNoticeDays(30);
        }
      } else {
        setSelectedEndorsements([]);
        setNoticeDays(30);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveInsReq(
    insuranceTypeId: string,
    patch: Partial<CustomerInsuranceRequirement>
  ) {
    if (!org) return;

    setErr(null);
    setSaveMsg(null);

    try {
      const current = getInsReqRow(insuranceTypeId);

await upsertCustomerInsuranceReq({
  id: current?.id,
  customer_id: org.id,
  insurance_type_id: insuranceTypeId,
  is_required: patch.is_required ?? current?.is_required ?? true,
  min_limit_each_occurrence:
    patch.min_limit_each_occurrence ?? current?.min_limit_each_occurrence ?? null,
  min_limit_aggregate:
    patch.min_limit_aggregate ?? current?.min_limit_aggregate ?? null,
  require_additional_insured:
    patch.require_additional_insured ?? current?.require_additional_insured ?? false,
  require_blanket_additional_insured:
    patch.require_blanket_additional_insured ??
    current?.require_blanket_additional_insured ??
    false,
  require_primary_noncontributory:
    patch.require_primary_noncontributory ??
    current?.require_primary_noncontributory ??
    false,
  require_waiver_subrogation:
    patch.require_waiver_subrogation ??
    current?.require_waiver_subrogation ??
    false,
  notes: patch.notes ?? current?.notes ?? null,
});
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save insurance requirement error");
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
    setSaveMsg(null);

    try {
      let savedCfgId = cfg.id || null;

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

        const saved = ins as CustomerInsuranceConfigRow;
        savedCfgId = saved.id;
        setCfg(saved);
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

      if (!savedCfgId) throw new Error("Config id missing after save");

      const { error: delErr } = await supabase
        .from("customer_required_endorsements")
        .delete()
        .eq("config_id", savedCfgId);

      if (delErr) throw delErr;

      if (selectedEndorsements.length > 0) {
        const payload: CustomerRequiredEndorsementRow[] = selectedEndorsements.map(
          (code) => ({
            config_id: savedCfgId!,
            endorsement_code: code,
            notice_days: noticeDays ?? null,
          })
        );

        const { error: insEndErr } = await supabase
          .from("customer_required_endorsements")
          .insert(payload);

        if (insEndErr) throw insEndErr;
      }

      setSaveMsg("Insurance configuration saved.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save config error");
    } finally {
      setSavingCfg(false);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading insurance settings...</p>
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
              Insurance Requirements
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Configure vendor pre-qualification insurance requirements and
              enterprise insurance validation rules for contractors working with
              your organization.
            </p>
          </div>

          <Link
            href="/customer/settings"
            className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            Back to Settings
          </Link>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {saveMsg ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
          {saveMsg}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0A2E5C]">
            Company Insurance Requirements
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#4B5563]">
            Contractors can see these requirements before working with your
            company. Admin review and approval can rely on these limits and
            endorsements.
          </p>
        </div>

        <div className="space-y-4">
          {insuranceTypes.map((it) => {
            const row = getInsReqRow(it.id);

            return (
              <section
                key={it.id}
                className="rounded-2xl border border-[#D9E2EC] bg-[#FBFDFF] p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="text-lg font-semibold text-[#111827]">{it.name}</h3>

                  <label className="flex items-center gap-2 text-sm font-medium text-[#111827]">
                    <input
                      type="checkbox"
                      checked={row?.is_required ?? true}
                      onChange={(e) =>
                        saveInsReq(it.id, { is_required: e.target.checked })
                      }
                    />
                    Required
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#111827]">
                      Min each occurrence
                    </label>
                    <input
                      className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                      placeholder="e.g. 1000000"
                      defaultValue={row?.min_limit_each_occurrence ?? ""}
                      onBlur={(e) =>
                        saveInsReq(it.id, {
                          min_limit_each_occurrence: moneyToNumber(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#111827]">
                      Min aggregate
                    </label>
                    <input
                      className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                      placeholder="e.g. 2000000"
                      defaultValue={row?.min_limit_aggregate ?? ""}
                      onBlur={(e) =>
                        saveInsReq(it.id, {
                          min_limit_aggregate: moneyToNumber(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="flex items-center gap-2 text-sm text-[#111827]">
                    <input
                      type="checkbox"
                      checked={row?.require_additional_insured ?? false}
                      onChange={(e) =>
                        saveInsReq(it.id, {
                          require_additional_insured: e.target.checked,
                        })
                      }
                    />
                    Additional Insured
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[#111827]">
                    <input
                      type="checkbox"
                      checked={row?.require_blanket_additional_insured ?? false}
                      onChange={(e) =>
                        saveInsReq(it.id, {
                          require_blanket_additional_insured: e.target.checked,
                        })
                      }
                    />
                    Blanket Additional Insured
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[#111827]">
                    <input
                      type="checkbox"
                      checked={row?.require_primary_noncontributory ?? false}
                      onChange={(e) =>
                        saveInsReq(it.id, {
                          require_primary_noncontributory: e.target.checked,
                        })
                      }
                    />
                    Primary & Non-contributory
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[#111827]">
                    <input
                      type="checkbox"
                      checked={row?.require_waiver_subrogation ?? false}
                      onChange={(e) =>
                        saveInsReq(it.id, {
                          require_waiver_subrogation: e.target.checked,
                        })
                      }
                    />
                    Waiver of Subrogation
                  </label>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-[#111827]">
                    Notes / Exceptions
                  </label>
                  <textarea
                    className="min-h-[100px] w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                    placeholder="Notes / exceptions"
                    defaultValue={row?.notes ?? ""}
                    onBlur={(e) =>
                      saveInsReq(it.id, { notes: e.target.value || null })
                    }
                  />
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-[#0A2E5C]">
            Insurance Validation Rules
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#4B5563]">
            These rules control warnings, hard blocks, insurer quality, state
            limitations, bond rules, and required endorsements.
          </p>
        </div>

        {!cfg ? (
          <div className="text-sm text-[#4B5563]">Loading config...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Minimum days before expiration
                </label>
                <input
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                  value={cfg.min_days_before_expiration ?? 0}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      min_days_before_expiration: Number(e.target.value || "0"),
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Warning days before expiration
                </label>
                <input
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                  value={cfg.warning_days_before_expiration ?? 30}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      warning_days_before_expiration: Number(
                        e.target.value || "0"
                      ),
                    })
                  }
                />
              </div>

              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-[#111827]">
                <input
                  type="checkbox"
                  checked={!!cfg.hard_block_if_expired}
                  onChange={(e) =>
                    setCfg({ ...cfg, hard_block_if_expired: e.target.checked })
                  }
                />
                Hard block if expired
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Minimum AM Best rating
                </label>
                <input
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                  placeholder="e.g. A-"
                  value={cfg.min_am_best_rating ?? ""}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      min_am_best_rating: e.target.value || null,
                    })
                  }
                />
              </div>

              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-[#111827]">
                <input
                  type="checkbox"
                  checked={!!cfg.must_be_admitted_carrier}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      must_be_admitted_carrier: e.target.checked,
                    })
                  }
                />
                Must be admitted carrier
              </label>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  State restrictions
                </label>
                <input
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                  placeholder="e.g. GA, FL"
                  value={cfg.state_restrictions ?? ""}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      state_restrictions: e.target.value || null,
                    })
                  }
                />
              </div>
            </div>

            <section className="rounded-2xl border border-[#E5EDF5] bg-[#FBFDFF] p-5 space-y-4">
              <h3 className="text-lg font-semibold text-[#0A2E5C]">
                Bond Requirements
              </h3>

              <label className="flex items-center gap-2 text-sm font-medium text-[#111827]">
                <input
                  type="checkbox"
                  checked={!!cfg.bond_required}
                  onChange={(e) =>
                    setCfg({ ...cfg, bond_required: e.target.checked })
                  }
                />
                Bond required
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={!!cfg.bid_bond}
                    onChange={(e) =>
                      setCfg({ ...cfg, bid_bond: e.target.checked })
                    }
                  />
                  Bid bond
                </label>

                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={!!cfg.performance_bond}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        performance_bond: e.target.checked,
                      })
                    }
                  />
                  Performance bond
                </label>

                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="checkbox"
                    checked={!!cfg.payment_bond}
                    onChange={(e) =>
                      setCfg({ ...cfg, payment_bond: e.target.checked })
                    }
                  />
                  Payment bond
                </label>
              </div>

              <div className="max-w-sm">
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Bond amount %
                </label>
                <input
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                  placeholder="e.g. 10"
                  value={cfg.bond_amount_percent ?? ""}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      bond_amount_percent:
                        e.target.value.trim() === ""
                          ? null
                          : Number(e.target.value),
                    })
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#E5EDF5] bg-[#FBFDFF] p-5 space-y-4">
              <h3 className="text-lg font-semibold text-[#0A2E5C]">
                Required Endorsements
              </h3>

              <div className="grid gap-3 md:grid-cols-2">
                {endorsementTypes.map((e) => (
                  <label
                    key={e.code}
                    className="flex items-center gap-2 text-sm text-[#111827]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEndorsements.includes(e.code)}
                      onChange={(ev) =>
                        toggleEndorsement(e.code, ev.target.checked)
                      }
                    />
                    {e.name}
                  </label>
                ))}
              </div>

              <div className="max-w-sm">
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Notice of Cancellation (days)
                </label>
                <input
                  className="w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5]"
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(Number(e.target.value || "0"))}
                />
              </div>
            </section>

            <div className="flex justify-end">
              <button
                className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white transition ${
                  savingCfg
                    ? "bg-[#9CA3AF]"
                    : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
                }`}
                onClick={saveConfigAndEndorsements}
                disabled={savingCfg}
              >
                {savingCfg ? "Saving..." : "Save Insurance Config"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}