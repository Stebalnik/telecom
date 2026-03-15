"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";
import {
  listMyTeamChangeRequestsDetailed,
  type TeamChangeRequestListRow,
} from "../../../../lib/contractor";

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

export default function ContractorTeamRequestsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<TeamChangeRequestListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();

      if (!profile || profile.role !== "contractor") {
        router.replace("/dashboard");
        return;
      }

      const result = await listMyTeamChangeRequestsDetailed();
      setRows(result);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    let reloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        load();
      }, 300);
    };

    const channel = supabase
      .channel("contractor-team-change-requests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_change_requests" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">
              Team change requests
            </h1>
            <p className="mt-2 text-sm text-[#4B5563]">
              Track all submitted requests to change team composition.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/contractor/teams/change-request"
              className="rounded-xl bg-[#2EA3FF] px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
            >
              New request
            </Link>

            <Link
              href="/contractor/teams"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to teams
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
          <p className="text-sm text-[#4B5563]">No requests yet.</p>
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
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1.4fr_2fr_1fr_1.5fr] lg:items-center">
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
                      Team
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#111827]">
                      {row.team_name || "—"}
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
                      Created
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#111827]">
                      {formatDate(row.created_at)}
                    </div>
                    <div className="mt-2 text-xs text-[#6B7280]">
                      Admin note: {row.admin_note || "—"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}