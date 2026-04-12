"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HOME_MARKET_OPTIONS,
  READY_TO_WORK_OPTIONS,
} from "../../../lib/geo/usStates";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { supabase } from "../../../lib/supabaseClient";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type WorkerProfileRow = {
  full_name: string | null;
  headline: string | null;
  summary: string | null;
  primary_role: string | null;
  secondary_roles: string[] | null;
  years_experience: number | null;
  home_market: string | null;
  markets: string[] | null;
  travel_willingness: string | null;
  employment_type_preference: string[] | null;
  availability_mode: string | null;
  phone: string | null;
};

type SpecialistProfileForm = {
  full_name: string;
  headline: string;
  summary: string;
  primary_role: string;
  secondary_roles: string[];
  years_experience: string;
  home_market: string;
  markets: string[];
  travel_willingness: string;
  employment_type_preference: string[];
  availability_mode: string;
  phone: string;
};

const ROLE_OPTIONS = [
  "Technician",
  "Climber",
  "Rigger",
  "Fiber Tech",
  "Foreman",
  "Electrician",
  "RF Tech",
  "Project Manager",
  "Inspector",
  "Driver",
  "Other",
] as const;

const YEARS_EXPERIENCE_OPTIONS = [
  { value: "0", label: "Less than 1 year" },
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "4", label: "4 years" },
  { value: "5", label: "5 years" },
  { value: "6", label: "6 years" },
  { value: "7", label: "7 years" },
  { value: "8", label: "8 years" },
  { value: "9", label: "9 years" },
  { value: "10", label: "10+ years" },
] as const;

const TRAVEL_WILLINGNESS_OPTIONS = [
  "Local only",
  "Within home state",
  "Regional travel",
  "Multi-state travel",
  "Nationwide travel",
] as const;

const EMPLOYMENT_PREFERENCE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Project-based",
  "Temporary",
  "Emergency deployments",
] as const;

const AVAILABILITY_MODE_OPTIONS = [
  "Available now",
  "Available this week",
  "Available this month",
  "Weekdays only",
  "Weekends only",
  "Part-time only",
  "By project schedule",
] as const;

const EMPTY_FORM: SpecialistProfileForm = {
  full_name: "",
  headline: "",
  summary: "",
  primary_role: "",
  secondary_roles: [],
  years_experience: "",
  home_market: "",
  markets: [],
  travel_willingness: "",
  employment_type_preference: [],
  availability_mode: "",
  phone: "",
};

function getSafeProfileErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
}

function addUniqueValue(list: string[], value: string) {
  if (!value || list.includes(value)) return list;
  return [...list, value];
}

function removeValue(list: string[], value: string) {
  return list.filter((item) => item !== value);
}

type MultiSelectChipsProps = {
  label: string;
  selectId: string;
  selectedValues: string[];
  options: readonly string[];
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
};

function MultiSelectChips({
  label,
  selectId,
  selectedValues,
  options,
  placeholder,
  onAdd,
  onRemove,
}: MultiSelectChipsProps) {
  const [valueToAdd, setValueToAdd] = useState("");

  const availableOptions = useMemo(
    () => options.filter((option) => !selectedValues.includes(option)),
    [options, selectedValues]
  );

  return (
    <div>
      <label
        htmlFor={selectId}
        className="mb-2 block text-sm font-medium text-[#111827]"
      >
        {label}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          id={selectId}
          value={valueToAdd}
          onChange={(e) => setValueToAdd(e.target.value)}
          className="flex-1 rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
        >
          <option value="">{placeholder}</option>
          {availableOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            if (!valueToAdd) return;
            onAdd(valueToAdd);
            setValueToAdd("");
          }}
          disabled={!valueToAdd}
          className={`rounded-xl px-4 py-3 text-sm font-medium text-white transition ${
            valueToAdd
              ? "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
              : "cursor-not-allowed bg-[#9CA3AF]"
          }`}
        >
          Add
        </button>
      </div>

      {selectedValues.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedValues.map((value) => (
            <div
              key={value}
              className="flex items-center gap-2 rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-1.5 text-sm text-[#111827]"
            >
              <span>{value}</span>
              <button
                type="button"
                onClick={() => onRemove(value)}
                className="font-medium text-[#1F6FB5] hover:text-[#0A2E5C]"
                aria-label={`Remove ${value}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#4B5563]">No options selected yet.</p>
      )}
    </div>
  );
}

export default function WorkerProfilePage() {
  const [form, setForm] = useState<SpecialistProfileForm>(EMPTY_FORM);
  const [marketToAdd, setMarketToAdd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setErr(null);
      setMessage(null);

      try {
        const sessionResult = await withErrorLogging(
          async () => {
            const result = await supabase.auth.getSession();
            if (result.error) throw result.error;
            return result;
          },
          {
            message: "specialist_profile_session_load_failed",
            code: "specialist_profile_session_load_failed",
            source: "frontend",
            area: "worker_profile",
            role: "specialist",
            path: "/worker/profile",
          }
        );

        if (!mounted) return;

        const userId = sessionResult.data.session?.user?.id;

        if (!userId) {
          setErr("Your session has expired. Please log in again.");
          return;
        }

        const profileResult = await withErrorLogging(
          async () => {
            const result = await supabase
              .from("worker_profiles")
              .select(
                `
                  full_name,
                  headline,
                  summary,
                  primary_role,
                  secondary_roles,
                  years_experience,
                  home_market,
                  markets,
                  travel_willingness,
                  employment_type_preference,
                  availability_mode,
                  phone
                `
              )
              .eq("user_id", userId)
              .maybeSingle();

            if (result.error) throw result.error;

            return result.data as WorkerProfileRow | null;
          },
          {
            message: "specialist_profile_load_failed",
            code: "specialist_profile_load_failed",
            source: "frontend",
            area: "worker_profile",
            role: "specialist",
            path: "/worker/profile",
          }
        );

        if (!mounted) return;

        if (!profileResult) {
          setForm(EMPTY_FORM);
          return;
        }

        setForm({
          full_name: profileResult.full_name ?? "",
          headline: profileResult.headline ?? "",
          summary: profileResult.summary ?? "",
          primary_role: profileResult.primary_role ?? "",
          secondary_roles: Array.isArray(profileResult.secondary_roles)
            ? profileResult.secondary_roles
            : [],
          years_experience:
            typeof profileResult.years_experience === "number"
              ? String(profileResult.years_experience)
              : "",
          home_market: profileResult.home_market ?? "",
          markets: Array.isArray(profileResult.markets)
            ? profileResult.markets
            : [],
          travel_willingness: profileResult.travel_willingness ?? "",
          employment_type_preference: Array.isArray(
            profileResult.employment_type_preference
          )
            ? profileResult.employment_type_preference
            : [],
          availability_mode: profileResult.availability_mode ?? "",
          phone: profileResult.phone ?? "",
        });
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeProfileErrorMessage(
            error,
            "Unable to load specialist profile. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField<K extends keyof SpecialistProfileForm>(
    key: K,
    value: SpecialistProfileForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function addMarket() {
    const nextMarket = marketToAdd.trim();
    if (!nextMarket) return;

    setForm((prev) => ({
      ...prev,
      markets: addUniqueValue(prev.markets, nextMarket),
    }));

    setMarketToAdd("");
  }

  function removeMarket(market: string) {
    setForm((prev) => ({
      ...prev,
      markets: removeValue(prev.markets, market),
    }));
  }

  const availableMarketOptions = useMemo(() => {
    return READY_TO_WORK_OPTIONS.filter(
      (market) =>
        !form.markets.includes(market) && market !== form.home_market
    );
  }, [form.home_market, form.markets]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setErr(null);
    setMessage(null);

    try {
      const sessionResult = await withErrorLogging(
        async () => {
          const result = await supabase.auth.getSession();
          if (result.error) throw result.error;
          return result;
        },
        {
          message: "specialist_profile_session_save_failed",
          code: "specialist_profile_session_save_failed",
          source: "frontend",
          area: "worker_profile",
          role: "specialist",
          path: "/worker/profile",
        }
      );

      const userId = sessionResult.data.session?.user?.id;

      if (!userId) {
        throw new Error("Not logged in");
      }

      await withErrorLogging(
        async () => {
          const result = await supabase.from("worker_profiles").upsert(
            {
              user_id: userId,
              full_name: form.full_name.trim() || null,
              headline: form.headline.trim() || null,
              summary: form.summary.trim() || null,
              primary_role: form.primary_role || null,
              secondary_roles: form.secondary_roles,
              years_experience:
                form.years_experience.trim() === ""
                  ? null
                  : Number(form.years_experience),
              home_market: form.home_market || null,
              markets: form.markets,
              travel_willingness: form.travel_willingness || null,
              employment_type_preference: form.employment_type_preference,
              availability_mode: form.availability_mode || null,
              phone: form.phone.trim() || null,
            },
            {
              onConflict: "user_id",
            }
          );

          if (result.error) throw result.error;
          return result;
        },
        {
          message: "specialist_profile_save_failed",
          code: "specialist_profile_save_failed",
          source: "frontend",
          area: "worker_profile",
          role: "specialist",
          path: "/worker/profile",
        }
      );

      setMessage("Specialist profile saved.");
    } catch (error) {
      setErr(
        getSafeProfileErrorMessage(
          error,
          "Unable to save specialist profile. Please try again."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">
          Specialist Profile
        </h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Build your individual telecom profile so contractors can understand
          your experience, roles, markets, and availability.
        </p>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading profile...</p>
        </section>
      ) : null}

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      {message ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
          {message}
        </section>
      ) : null}

      {!loading ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="full_name"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Phone
              </label>
              <input
                id="phone"
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                placeholder="Phone number"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="headline"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Headline
              </label>
              <input
                id="headline"
                type="text"
                value={form.headline}
                onChange={(e) => updateField("headline", e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                placeholder="Example: Telecom Field Specialist | Tower & Fiber Experience"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="summary"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Summary
              </label>
              <textarea
                id="summary"
                rows={5}
                value={form.summary}
                onChange={(e) => updateField("summary", e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                placeholder="Describe your experience, specialties, and the type of field work you do."
              />
            </div>

            <div>
              <label
                htmlFor="primary_role"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Primary role
              </label>
              <select
                id="primary_role"
                value={form.primary_role}
                onChange={(e) => updateField("primary_role", e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">Select primary role</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <MultiSelectChips
              label="Secondary roles"
              selectId="secondary_roles"
              selectedValues={form.secondary_roles}
              options={ROLE_OPTIONS}
              placeholder="Select secondary role"
              onAdd={(value) =>
                updateField(
                  "secondary_roles",
                  addUniqueValue(form.secondary_roles, value)
                )
              }
              onRemove={(value) =>
                updateField(
                  "secondary_roles",
                  removeValue(form.secondary_roles, value)
                )
              }
            />

            <div>
              <label
                htmlFor="years_experience"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Years of experience
              </label>
              <select
                id="years_experience"
                value={form.years_experience}
                onChange={(e) =>
                  updateField("years_experience", e.target.value)
                }
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">Select experience</option>
                {YEARS_EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="home_market"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Home state
              </label>
              <select
                id="home_market"
                value={form.home_market}
                onChange={(e) => updateField("home_market", e.target.value)}
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">Select home state</option>
                {HOME_MARKET_OPTIONS.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="markets"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Ready to work in
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  id="markets"
                  value={marketToAdd}
                  onChange={(e) => setMarketToAdd(e.target.value)}
                  className="flex-1 rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                >
                  <option value="">Select a state or Nationwide</option>
                  {availableMarketOptions.map((market) => (
                    <option key={market} value={market}>
                      {market}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addMarket}
                  disabled={!marketToAdd}
                  className={`rounded-xl px-4 py-3 text-sm font-medium text-white transition ${
                    marketToAdd
                      ? "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
                      : "cursor-not-allowed bg-[#9CA3AF]"
                  }`}
                >
                  Add
                </button>
              </div>

              {form.markets.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.markets.map((market) => (
                    <div
                      key={market}
                      className="flex items-center gap-2 rounded-full border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-1.5 text-sm text-[#111827]"
                    >
                      <span>{market}</span>
                      <button
                        type="button"
                        onClick={() => removeMarket(market)}
                        className="font-medium text-[#1F6FB5] hover:text-[#0A2E5C]"
                        aria-label={`Remove ${market}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#4B5563]">
                  No additional states selected yet.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="travel_willingness"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Travel willingness
              </label>
              <select
                id="travel_willingness"
                value={form.travel_willingness}
                onChange={(e) =>
                  updateField("travel_willingness", e.target.value)
                }
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">Select travel willingness</option>
                {TRAVEL_WILLINGNESS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <MultiSelectChips
              label="Employment preference"
              selectId="employment_type_preference"
              selectedValues={form.employment_type_preference}
              options={EMPLOYMENT_PREFERENCE_OPTIONS}
              placeholder="Select employment preference"
              onAdd={(value) =>
                updateField(
                  "employment_type_preference",
                  addUniqueValue(form.employment_type_preference, value)
                )
              }
              onRemove={(value) =>
                updateField(
                  "employment_type_preference",
                  removeValue(form.employment_type_preference, value)
                )
              }
            />

            <div>
              <label
                htmlFor="availability_mode"
                className="mb-2 block text-sm font-medium text-[#111827]"
              >
                Availability mode
              </label>
              <select
                id="availability_mode"
                value={form.availability_mode}
                onChange={(e) =>
                  updateField("availability_mode", e.target.value)
                }
                className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                <option value="">Select availability mode</option>
                {AVAILABILITY_MODE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`rounded-xl px-5 py-3 text-sm font-medium text-white transition ${
                saving
                  ? "cursor-not-allowed bg-[#9CA3AF]"
                  : "bg-[#1F6FB5] hover:bg-[#0A2E5C]"
              }`}
            >
              {saving ? "Saving..." : "Save profile"}
            </button>

            <a
              href="/worker/certifications"
              className="rounded-xl border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Go to certifications
            </a>
          </div>
        </form>
      ) : null}
    </main>
  );
}