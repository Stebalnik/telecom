"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../../lib/profile";
import { supabase } from "../../../lib/supabaseClient";
import { unwrapSupabase } from "../../../lib/errors/unwrapSupabase";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import { type TeamChangeRequest } from "../../../lib/contractor";

type TeamChangeRequestRow = TeamChangeRequest & {
  company?: {
    id: string;
    legal_name: string | null;
    dba_name: string | null;
  } | null;
};

type TeamChangeRequestRowDb = Omit<TeamChangeRequestRow, "company"> & {
  company?:
    | {
        id: string;
        legal_name: string | null;
        dba_name: string | null;
      }
    | {
        id: string;
        legal_name: string | null;
        dba_name: string | null;
      }[]
    | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles =
    status === "approved"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "rejected"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {status}
    </span>
  );
}

function normalizeTeamChangeRequestRow(row: TeamChangeRequestRowDb): TeamChangeRequestRow {
  return {
    ...row,
    company: Array.isArray(row.company) ? row.company[0] ?? null : row.company,
  };
}

export default function AdminTeamChangeRequestsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<TeamChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const nextRows = await withErrorLogging(
        async () => {
          const sessionResult = await supabase.auth.getSession();

          if (sessionResult.error) {
            throw sessionResult.error;
          }

          if (!sessionResult.data.session?.user) {
            router.replace("/login");
            return null;
          }

          const profile = await getMyProfile();

          if (!profile || profile.role !== "admin") {
            router.replace("/dashboard");
            return null;
          }

          const requestRowsResult = await supabase
            .from("team_change_requests")
            .select(`
              id,
              company_id,
              team_id,
              requested_by,
              reason,
              status,
              admin_note,
              created_at,
              updated_at,
              company:contractor_companies (
                id,
                legal_name,
                dba_name
              )
            `)
            .order("created_at", { ascending: false });

          const requestRows = unwrapSupabase(
            requestRowsResult,
            "admin_team_change_requests_load_failed"
          ) as TeamChangeRequestRowDb[];

          return requestRows.map(normalizeTeamChangeRequestRow);
        },
        {
          message: "admin_team_change_requests_load_failed",
          code: "admin_team_change_requests_load_failed",
          source: "frontend",
          area: "admin",
          path: "/admin/team-change-requests",
          role: "admin",
        }
      );

      if (nextRows) {
        setRows(nextRows);
      }
    } catch {
      setErr("Unable to load team change requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        void load();
      }, 300);
    };

    const requestsChannel = supabase
      .channel("admin-team-change-requests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_change_requests" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(requestsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                Team change requests
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Review contractor requests to change team composition.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">Loading requests...</p>
          </section>
        ) : null}

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        {!loading && rows.length === 0 ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">No team change requests.</p>
          </section>
        ) : null}

        {!loading && rows.length > 0 ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="grid gap-4">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_1.8fr_1fr_1.2fr_1.4fr_auto] lg:items-center">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Company
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {row.company?.legal_name || "—"}
                      </div>
                      <div className="mt-1 text-xs text-[#6B7280]">
                        Company ID: {row.company?.id || row.company_id}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Reason
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {row.reason}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Status
                      </div>
                      <div className="mt-2">
                        <StatusBadge status={row.status} />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Request ID
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827] break-all">
                        {row.id}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                        Created
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#111827]">
                        {formatDate(row.created_at)}
                      </div>
                    </div>

                    <div className="lg:text-right">
                      <Link
                        href={`/admin/team-change-requests/${row.id}`}
                        className="inline-flex rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}