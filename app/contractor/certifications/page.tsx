"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";
import { withErrorLogging } from "../../../lib/errors/withErrorLogging";
import {
  getMyCompany,
  listTeams,
  listMembers,
  type Company,
  type Team,
  type TeamMember,
} from "../../../lib/contractor";
import {
  createCertDocument,
  deleteDocument,
  listCertTypes,
  listMemberCerts,
  type CertType,
  type DocumentRow,
} from "../../../lib/documents";

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "").toLowerCase();

  const cls =
    normalized === "approved" || normalized === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : normalized === "rejected" || normalized === "blocked"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}
    >
      {status || "Unknown"}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#0A2E5C]">{value}</div>
      {hint ? <div className="mt-1 text-sm text-[#4B5563]">{hint}</div> : null}
    </div>
  );
}

export default function ContractorCertificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [memberCerts, setMemberCerts] = useState<Record<string, DocumentRow[]>>(
    {}
  );

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [certTypeId, setCertTypeId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function loadTeamMembersWithCerts(teamId: string) {
    const members = await withErrorLogging(
      () => listMembers(teamId),
      {
        message: "load_team_members_failed",
        code: "load_team_members_failed",
        source: "frontend",
        area: "contractor",
        path: "/contractor/certifications",
        role: "contractor",
        details: {
          teamId,
        },
      }
    );

    setTeamMembers(members);

    const certMap: Record<string, DocumentRow[]> = {};

    for (const member of members) {
      certMap[member.id] = await withErrorLogging(
        () => listMemberCerts(member.id),
        {
          message: "load_member_certifications_failed",
          code: "load_member_certifications_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/certifications",
          role: "contractor",
          details: {
            teamId,
            memberId: member.id,
          },
        }
      );
    }

    setMemberCerts(certMap);

    setSelectedMemberId((prev) =>
      prev && members.some((m) => m.id === prev) ? prev : members[0]?.id || ""
    );
  }

  async function loadPage() {
    setLoading(true);
    setErr(null);

    try {
      await withErrorLogging(
        async () => {
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

          const currentCompany = await getMyCompany();

          if (!currentCompany || currentCompany.onboarding_status === "draft") {
            router.replace("/contractor/onboarding/company");
            return;
          }

          setCompany(currentCompany);

          const [companyTeams, certificationTypes] = await Promise.all([
            listTeams(currentCompany.id),
            listCertTypes(),
          ]);

          setTeams(companyTeams);
          setCertTypes(certificationTypes);

          if (companyTeams.length > 0) {
            const nextTeamId =
              selectedTeamId && companyTeams.some((t) => t.id === selectedTeamId)
                ? selectedTeamId
                : companyTeams[0].id;

            setSelectedTeamId(nextTeamId);
            await loadTeamMembersWithCerts(nextTeamId);
          } else {
            setSelectedTeamId("");
            setTeamMembers([]);
            setMemberCerts({});
            setSelectedMemberId("");
          }
        },
        {
          message: "contractor_certifications_load_failed",
          code: "contractor_certifications_load_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/certifications",
          role: "contractor",
        }
      );
    } catch {
      setErr("Unable to load certifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTeamChange(teamId: string) {
    try {
      setBusy(true);
      setErr(null);
      setSelectedTeamId(teamId);

      await withErrorLogging(
        () => loadTeamMembersWithCerts(teamId),
        {
          message: "contractor_certifications_team_change_failed",
          code: "contractor_certifications_team_change_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/certifications",
          role: "contractor",
          details: {
            teamId,
          },
        }
      );
    } catch {
      setErr("Unable to load the selected team. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload() {
    try {
      if (!selectedTeamId) {
        setErr("Select a team.");
        return;
      }
      if (!selectedMemberId) {
        setErr("Select a member.");
        return;
      }
      if (!certTypeId) {
        setErr("Select certificate type.");
        return;
      }
      if (!expiresAt) {
        setErr("Set expiration date.");
        return;
      }
      if (!file) {
        setErr("Choose a file.");
        return;
      }

      setBusy(true);
      setErr(null);

      await withErrorLogging(
        () =>
          createCertDocument({
            memberId: selectedMemberId,
            certTypeId,
            expiresAt,
            file,
          }),
        {
          message: "contractor_certificate_upload_failed",
          code: "contractor_certificate_upload_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/certifications",
          role: "contractor",
          details: {
            teamId: selectedTeamId,
            memberId: selectedMemberId,
            certTypeId,
            expiresAt,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          },
        }
      );

      setCertTypeId("");
      setExpiresAt("");
      setFile(null);

      await withErrorLogging(
        () => loadTeamMembersWithCerts(selectedTeamId),
        {
          message: "contractor_certifications_reload_after_upload_failed",
          code: "contractor_certifications_reload_after_upload_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/certifications",
          role: "contractor",
          details: {
            teamId: selectedTeamId,
            memberId: selectedMemberId,
          },
        }
      );
    } catch {
      setErr("Unable to upload the certificate. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(doc: DocumentRow) {
    try {
      setBusy(true);
      setErr(null);

      await withErrorLogging(
        () =>
          deleteDocument({
            id: doc.id,
            file_path: doc.file_path,
          }),
        {
          message: "contractor_certificate_delete_failed",
          code: "contractor_certificate_delete_failed",
          source: "frontend",
          area: "documents",
          path: "/contractor/certifications",
          role: "contractor",
          details: {
            documentId: doc.id,
            filePath: doc.file_path,
            memberId: doc.team_member_id ?? null,
            certTypeId: doc.cert_type_id ?? null,
          },
        }
      );

      if (selectedTeamId) {
        await withErrorLogging(
          () => loadTeamMembersWithCerts(selectedTeamId),
          {
            message: "contractor_certifications_reload_after_delete_failed",
            code: "contractor_certifications_reload_after_delete_failed",
            source: "frontend",
            area: "documents",
            path: "/contractor/certifications",
            role: "contractor",
            details: {
              teamId: selectedTeamId,
              documentId: doc.id,
            },
          }
        );
      }
    } catch {
      setErr("Unable to delete the certificate. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const selectedMember = useMemo(
    () => teamMembers.find((m) => m.id === selectedMemberId) || null,
    [teamMembers, selectedMemberId]
  );

  const allTeamDocs = useMemo(
    () => Object.values(memberCerts).flat(),
    [memberCerts]
  );

  const totalCerts = allTeamDocs.length;
  const approvedCount = allTeamDocs.filter(
    (doc) => doc.verification_status === "approved"
  ).length;
  const pendingCount = allTeamDocs.filter(
    (doc) => doc.verification_status === "pending"
  ).length;
  const rejectedCount = allTeamDocs.filter(
    (doc) => doc.verification_status === "rejected"
  ).length;

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="LEOTEOR"
              width={24}
              height={24}
              className="h-6 w-6 rounded object-contain"
            />
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2E5C]">
                Certifications
              </h1>
              <p className="mt-1 text-sm text-[#4B5563]">
                Loading member certifications...
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="LEOTEOR"
                width={24}
                height={24}
                className="h-6 w-6 rounded object-contain"
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#4B5563]">
                Contractor workspace
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Certifications
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Select a team, upload certificates for team members, and review
              which certifications each team member already has.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/contractor/teams"
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Open teams
            </Link>

            <Link
              href="/contractor"
              className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
            >
              Back to overview
            </Link>
          </div>
        </div>

        {err ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Selected team" value={selectedTeam?.name || "—"} />
        <StatCard label="Team members" value={teamMembers.length} />
        <StatCard label="Certificates" value={totalCerts} />
        <StatCard
          label="Statuses"
          value={`${approvedCount}/${pendingCount}/${rejectedCount}`}
          hint="Approved / Pending / Rejected"
        />
      </section>

      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#0A2E5C]">Select team</h2>

        <div className="mt-4 max-w-md">
          <label className="block text-sm font-medium text-[#0A2E5C]">
            Team
          </label>
          <select
            className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
            value={selectedTeamId}
            onChange={(e) => void handleTeamChange(e.target.value)}
            disabled={busy || teams.length === 0}
          >
            <option value="">Select team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2E5C]">
            Upload certificate
          </h2>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0A2E5C]">
                Member
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                disabled={busy || teamMembers.length === 0}
              >
                <option value="">Select member</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0A2E5C]">
                Certificate type
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                value={certTypeId}
                onChange={(e) => setCertTypeId(e.target.value)}
              >
                <option value="">Select certificate type</option>
                {certTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0A2E5C]">
                Expiration date
              </label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#2EA3FF] focus:ring-2 focus:ring-[#8FC8FF]"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0A2E5C]">
                File
              </label>
              <input
                type="file"
                className="mt-1 block w-full rounded-xl border border-[#D9E2EC] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#EAF3FF] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1F6FB5]"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4 text-sm text-[#4B5563]">
              Uploading for:{" "}
              <span className="font-medium text-[#111827]">
                {selectedMember?.full_name || "No member selected"}
              </span>
            </div>

            <div className="pt-1">
              <button
                onClick={() => void handleUpload()}
                disabled={busy || teamMembers.length === 0}
                className="inline-flex items-center justify-center rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Upload certificate
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0A2E5C]">
            Team members and certificates
          </h2>

          <div className="mt-4 space-y-4">
            {teamMembers.length === 0 ? (
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] px-4 py-6 text-sm text-[#4B5563]">
                No members in this team yet.
              </div>
            ) : (
              teamMembers.map((member) => {
                const docs = memberCerts[member.id] || [];

                return (
                  <div
                    key={member.id}
                    className="rounded-xl border border-[#D9E2EC] bg-[#F9FBFD] p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[#111827]">
                          {member.full_name}
                        </div>
                        <div className="mt-1 text-sm text-[#4B5563]">
                          {member.role_title || "No role title"}
                        </div>
                      </div>

                      <div className="text-sm text-[#4B5563]">
                        Certificates:{" "}
                        <span className="font-medium text-[#111827]">
                          {docs.length}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {docs.length === 0 ? (
                        <div className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#4B5563]">
                          No certificates yet.
                        </div>
                      ) : (
                        docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="rounded-xl border border-[#D9E2EC] bg-white p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[#111827]">
                                  {doc.cert_type?.name ?? "Certificate"}
                                </div>
                                <div className="mt-1 text-sm text-[#4B5563]">
                                  Expires: {doc.expires_at || "—"}
                                </div>
                                {doc.verification_note ? (
                                  <div className="mt-2 text-sm text-red-700">
                                    {doc.verification_note}
                                  </div>
                                ) : null}
                              </div>

                              <StatusBadge status={doc.verification_status} />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <a
                                href={doc.file_public_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#1F6FB5] transition hover:bg-[#F4F8FC]"
                              >
                                Open file
                              </a>

                              <button
                                onClick={() => void handleDelete(doc)}
                                disabled={busy}
                                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}