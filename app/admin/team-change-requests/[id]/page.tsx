"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getMyProfile } from "../../../../lib/profile";
import { supabase } from "../../../../lib/supabaseClient";
import {
  applyApprovedTeamChangeRequest,
  listTeamChangeRequestMembers,
  updateTeamChangeRequestStatus,
  type TeamChangeRequest,
  type TeamChangeRequestMember,
} from "../../../../lib/contractor";

type TeamChangeRequestDetail = TeamChangeRequest & {
  company?: {
    id: string;
    legal_name: string | null;
    dba_name: string | null;
  } | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
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

export default function AdminTeamChangeRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [row, setRow] = useState<TeamChangeRequestDetail | null>(null);
  const [members, setMembers] = useState<TeamChangeRequestMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

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

      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const { data: requestRow, error: requestError } = await supabase
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
        .eq("id", params.id)
        .single();

      if (requestError) throw requestError;

      const normalizedRow = {
        ...requestRow,
        company: Array.isArray((requestRow as any).company)
          ? (requestRow as any).company[0] ?? null
          : (requestRow as any).company,
      } as TeamChangeRequestDetail;

      const requestMembers = await listTeamChangeRequestMembers(params.id);

      setRow(normalizedRow);
      setMembers(requestMembers);
      setAdminNote(normalizedRow.admin_note || "");
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleDecision(status: "approved" | "rejected") {
    if (!row || row.status !== "pending" || saving) return;

    setSaving(true);
    setErr(null);

    try {
      await updateTeamChangeRequestStatus({
        requestId: row.id,
        status,
        adminNote,
      });

      if (status === "approved") {
        await applyApprovedTeamChangeRequest(row.id);
      }

      router.push("/admin/team-change-requests");
      return;
    } catch (e: any) {
      setErr(e.message ?? "Update error");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#111827]">
                Team change request
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Review requested team composition and make an admin decision.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/team-change-requests"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
              >
                Back to requests
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <p className="text-sm text-[#4B5563]">Loading request...</p>
          </section>
        ) : null}

        {err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : null}

        {!loading && row ? (
          <>
            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                    Company
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#111827]">
                    {row.company?.legal_name || "—"}
                  </div>
                  <div className="mt-1 text-xs text-[#6B7280]">
                    DBA: {row.company?.dba_name || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                    Company ID
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#111827] break-all">
                    {row.company?.id || row.company_id}
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
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                  Reason
                </div>
                <div className="mt-2 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#111827]">
                  {row.reason}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Requested team composition
              </h2>

              {members.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                  No proposed members attached to this request.
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-2xl border border-[#D9E2EC] bg-[#FCFDFE] p-5"
                    >
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Full name
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {member.full_name}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Role
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {member.role_title || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Phone
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {member.phone || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Email
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {member.email || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                            Date of birth
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#111827]">
                            {member.date_of_birth || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Admin decision
              </h2>

              <div className="mt-4">
                <label className="block text-sm font-medium text-[#111827]">
                  Admin note
                </label>
                <textarea
                  className="mt-2 min-h-[120px] w-full rounded-2xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                  placeholder="Optional note for approval or rejection"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  disabled={row.status !== "pending" || saving}
                />
              </div>

              {row.status === "pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDecision("approved")}
                    className="rounded-xl bg-[#1F6FB5] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Processing..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDecision("rejected")}
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                  This request has already been finalized and can no longer be changed.
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}