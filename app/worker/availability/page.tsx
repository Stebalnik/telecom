"use client";

import { useEffect, useMemo, useState } from "react";
import { READY_TO_WORK_OPTIONS } from "../../../lib/geo/usStates";
import { normalizeError } from "../../../lib/errors/normalizeError";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { supabase } from "../../../lib/supabaseClient";

type AppLikeError = Error & {
  code?: string;
  details?: Record<string, unknown>;
};

type AvailabilityRow = {
  id: string;
  weekday: string | null;
  market: string | null;
  is_available: boolean | null;
  time_notes: string | null;
};

type AvailabilityFormRow = {
  weekday: string;
  market: string;
  is_available: boolean;
  time_notes: string;
};

type WorkerProfileAvailabilityMeta = {
  employment_type_preference: string[] | null;
  availability_mode: string | null;
};

const WEEKDAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const AVAILABILITY_ENABLED_EMPLOYMENT_TYPES = new Set([
  "Part-time",
  "Temporary",
  "Project-based",
  "Contract",
]);

const DEFAULT_ROWS: AvailabilityFormRow[] = WEEKDAY_OPTIONS.map((day) => ({
  weekday: day,
  market: "",
  is_available: false,
  time_notes: "",
}));

function getSafeAvailabilityErrorMessage(error: unknown, fallback: string) {
  const normalized = normalizeError(error) as AppLikeError;
  const code = String(normalized.code || "");

  if (code.includes("not_logged_in")) {
    return "Your session has expired. Please log in again.";
  }

  return fallback;
}

function createDefaultRows() {
  return DEFAULT_ROWS.map((row) => ({ ...row }));
}

function normalizeEmploymentPreferences(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function canUseAvailability(
  employmentTypePreference: string[] | null | undefined
) {
  const normalized = normalizeEmploymentPreferences(employmentTypePreference);

  return normalized.some((item) =>
    AVAILABILITY_ENABLED_EMPLOYMENT_TYPES.has(item)
  );
}

export default function WorkerAvailabilityPage() {
  const [rows, setRows] = useState<AvailabilityFormRow[]>(createDefaultRows);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [employmentPreferences, setEmploymentPreferences] = useState<string[]>(
    []
  );
  const [availabilityMode, setAvailabilityMode] = useState<string | null>(null);

  const availabilityEnabled = useMemo(() => {
    return canUseAvailability(employmentPreferences);
  }, [employmentPreferences]);

  const availableCount = useMemo(() => {
    return rows.filter((row) => row.is_available).length;
  }, [rows]);

  useEffect(() => {
    let mounted = true;

    async function loadAvailability() {
      setLoading(true);
      setErr(null);
      setMessage(null);

      try {
        const sessionResult = await withErrorLogging(
          async () => {
            const result = await supabase.auth.getSession();

            if (result.error) {
              throw result.error;
            }

            return result;
          },
          {
            message: "worker_availability_session_load_failed",
            code: "worker_availability_session_load_failed",
            source: "frontend",
            area: "worker_availability",
            role: "worker",
            path: "/worker/availability",
          }
        );

        if (!mounted) return;

        const userId = sessionResult.data.session?.user?.id;

        if (!userId) {
          setErr("Your session has expired. Please log in again.");
          return;
        }

        const profileMeta = await withErrorLogging(
          async () => {
            const result = await supabase
              .from("worker_profiles")
              .select("employment_type_preference, availability_mode")
              .eq("user_id", userId)
              .maybeSingle();

            if (result.error) {
              throw result.error;
            }

            return (result.data ?? null) as WorkerProfileAvailabilityMeta | null;
          },
          {
            message: "worker_availability_profile_meta_load_failed",
            code: "worker_availability_profile_meta_load_failed",
            source: "frontend",
            area: "worker_availability",
            role: "worker",
            path: "/worker/availability",
          }
        );

        if (!mounted) return;

        const nextEmploymentPreferences = normalizeEmploymentPreferences(
          profileMeta?.employment_type_preference
        );

        setEmploymentPreferences(nextEmploymentPreferences);
        setAvailabilityMode(profileMeta?.availability_mode ?? null);

        if (!canUseAvailability(nextEmploymentPreferences)) {
          setRows(createDefaultRows());
          return;
        }

        const availabilityResult = await withErrorLogging(
          async () => {
            const result = await supabase
              .from("worker_availability")
              .select("id, weekday, market, is_available, time_notes")
              .eq("worker_id", userId);

            if (result.error) {
              throw result.error;
            }

            return (result.data ?? []) as AvailabilityRow[];
          },
          {
            message: "worker_availability_load_failed",
            code: "worker_availability_load_failed",
            source: "frontend",
            area: "worker_availability",
            role: "worker",
            path: "/worker/availability",
          }
        );

        if (!mounted) return;

        if (!availabilityResult.length) {
          setRows(createDefaultRows());
          return;
        }

        const baseRows = createDefaultRows();

        for (const existing of availabilityResult) {
          const weekday = String(existing.weekday || "");
          const index = baseRows.findIndex((row) => row.weekday === weekday);

          if (index >= 0) {
            baseRows[index] = {
              weekday,
              market: existing.market ?? "",
              is_available: Boolean(existing.is_available),
              time_notes: existing.time_notes ?? "",
            };
          }
        }

        setRows(baseRows);
      } catch (error) {
        if (!mounted) return;
        setErr(
          getSafeAvailabilityErrorMessage(
            error,
            "Unable to load availability. Please refresh and try again."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      mounted = false;
    };
  }, []);

  function updateRow(weekday: string, patch: Partial<AvailabilityFormRow>) {
    setRows((prev) =>
      prev.map((row) =>
        row.weekday === weekday
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!availabilityEnabled) {
      return;
    }

    setSaving(true);
    setErr(null);
    setMessage(null);

    try {
      const sessionResult = await withErrorLogging(
        async () => {
          const result = await supabase.auth.getSession();

          if (result.error) {
            throw result.error;
          }

          return result;
        },
        {
          message: "worker_availability_session_save_failed",
          code: "worker_availability_session_save_failed",
          source: "frontend",
          area: "worker_availability",
          role: "worker",
          path: "/worker/availability",
        }
      );

      const userId = sessionResult.data.session?.user?.id;

      if (!userId) {
        throw new Error("Not logged in");
      }

      await withErrorLogging(
        async () => {
          const deleteResult = await supabase
            .from("worker_availability")
            .delete()
            .eq("worker_id", userId);

          if (deleteResult.error) {
            throw deleteResult.error;
          }

          const insertPayload = rows.map((row) => ({
            worker_id: userId,
            weekday: row.weekday,
            market: row.market || null,
            is_available: row.is_available,
            time_notes: row.time_notes.trim() || null,
          }));

          const insertResult = await supabase
            .from("worker_availability")
            .insert(insertPayload);

          if (insertResult.error) {
            throw insertResult.error;
          }

          return insertResult;
        },
        {
          message: "worker_availability_save_failed",
          code: "worker_availability_save_failed",
          source: "frontend",
          area: "worker_availability",
          role: "worker",
          path: "/worker/availability",
          details: {
            availableDays: rows.filter((row) => row.is_available).length,
          },
        }
      );

      setMessage("Availability saved.");
    } catch (error) {
      setErr(
        getSafeAvailabilityErrorMessage(
          error,
          "Unable to save availability. Please try again."
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
          Availability
        </h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          This section is intended for specialists who want to expose part-time,
          temporary, contract, or project-based availability.
        </p>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#4B5563]">Loading availability...</p>
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

      {!loading && !availabilityEnabled ? (
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">
            Availability is not enabled for your current profile
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            This section is shown when your employment preference includes
            Part-time, Temporary, Contract, or Project-based work.
          </p>

          <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
            <div className="text-sm font-medium text-[#111827]">
              Current employment preferences
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {employmentPreferences.length > 0 ? (
                employmentPreferences.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-[#D9E2EC] bg-white px-3 py-1.5 text-xs font-medium text-[#4B5563]"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[#4B5563]">Not specified</span>
              )}
            </div>

            {availabilityMode ? (
              <div className="mt-4 text-sm text-[#4B5563]">
                <span className="font-medium text-[#111827]">
                  Availability mode:
                </span>{" "}
                {availabilityMode}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/worker/profile"
              className="rounded-xl bg-[#1F6FB5] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
            >
              Update profile preferences
            </a>

            <a
              href="/worker/vacancies"
              className="rounded-xl border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Go to vacancies
            </a>
          </div>
        </section>
      ) : null}

      {!loading && availabilityEnabled ? (
        <>
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
            <div className="text-sm text-[#4B5563]">Available days selected</div>
            <div className="mt-2 text-3xl font-semibold text-[#0A2E5C]">
              {availableCount}
            </div>
            <p className="mt-2 text-sm text-[#4B5563]">
              This is the initial weekly availability setup. Later this can be
              expanded into repeating windows, date ranges, and calendar-based
              availability.
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              {rows.map((row) => (
                <div
                  key={row.weekday}
                  className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[160px_140px_1fr_1.2fr] lg:items-start">
                    <div>
                      <div className="text-sm font-semibold text-[#111827]">
                        {row.weekday}
                      </div>
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-[#D9E2EC] bg-white px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.is_available}
                        onChange={(e) =>
                          updateRow(row.weekday, {
                            is_available: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium text-[#111827]">
                        Available
                      </span>
                    </label>

                    <div>
                      <label
                        htmlFor={`market-${row.weekday}`}
                        className="mb-2 block text-sm font-medium text-[#111827]"
                      >
                        Market
                      </label>
                      <select
                        id={`market-${row.weekday}`}
                        value={row.market}
                        onChange={(e) =>
                          updateRow(row.weekday, { market: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                      >
                        <option value="">Select market</option>
                        {READY_TO_WORK_OPTIONS.map((option) => (
                          <option
                            key={`${row.weekday}-${option}`}
                            value={option}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`notes-${row.weekday}`}
                        className="mb-2 block text-sm font-medium text-[#111827]"
                      >
                        Time notes
                      </label>
                      <input
                        id={`notes-${row.weekday}`}
                        type="text"
                        value={row.time_notes}
                        onChange={(e) =>
                          updateRow(row.weekday, {
                            time_notes: e.target.value,
                          })
                        }
                        placeholder="Example: 7 AM - 5 PM, evenings, overnight..."
                        className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
                {saving ? "Saving..." : "Save availability"}
              </button>

              <a
                href="/worker/vacancies"
                className="rounded-xl border border-[#D9E2EC] bg-white px-5 py-3 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Go to vacancies
              </a>
            </div>
          </form>
        </>
      ) : null}
    </main>
  );
}