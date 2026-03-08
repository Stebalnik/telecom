"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";
import {
  approveDoc,
  listPendingDocs,
  rejectDoc,
  AdminDoc,
} from "../../lib/adminDocs";

type AdminFilter = "all" | "documents" | "company_changes";

type RequestRow = {
  id: string;
  company_id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  company?: {
    legal_name: string | null;
    dba_name: string | null;
  } | null;
};

type RequestRowDb = {
  id: string;
  company_id: string;
  requested_by: string;
  status: string | null;
  created_at: string;
  reviewed_at: string | null;
  company:
    | {
        legal_name: string | null;
        dba_name: string | null;
      }
    | {
        legal_name: string | null;
        dba_name: string | null;
      }[]
    | null;
};

function mapRequestRow(row: RequestRowDb): RequestRow {
  const company = Array.isArray(row.company) ? row.company[0] ?? null : row.company;

  return {
    id: row.id,
    company_id: row.company_id,
    requested_by: row.requested_by,
    status:
      row.status === "approved" || row.status === "rejected"
        ? row.status
        : "pending",
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    company: company
      ? {
          legal_name: company.legal_name,
          dba_name: company.dba_name,
        }
      : null,
  };
}

export default function AdminPage() {
  const router = useRouter();

  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [companyRequests, setCompanyRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<AdminFilter>("all");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      const profile = await getMyProfile();
      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      const [docsResult, requestsResult] = await Promise.all([
        listPendingDocs(),
        supabase
          .from("company_change_requests")
          .select(`
            id,
            company_id,
            requested_by,
            status,
            created_at,
            reviewed_at,
            company:contractor_companies (
              legal_name,
              dba_name
            )
          `)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      setDocs(docsResult);

      if (requestsResult.error) {
        throw new Error(requestsResult.error.message);
      }

      const normalized = ((requestsResult.data ?? []) as RequestRowDb[]).map(
        mapRequestRow
      );
      setCompanyRequests(normalized);
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

    const docsChannel = supabase
      .channel("admin-documents-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => scheduleReload()
      )
      .subscribe();

    const companyRequestsChannel = supabase
      .channel("admin-company-change-requests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_change_requests" },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(docsChannel);
      supabase.removeChannel(companyRequestsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onApprove(id: string) {
    setErr(null);
    try {
      await approveDoc(id);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Approve error");
    }
  }

  async function onReject(id: string) {
    setErr(null);
    try {
      await rejectDoc(id, rejectNote[id] || "Rejected");
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Reject error");
    }
  }

  const counts = useMemo(
    () => ({
      documents: docs.length,
      companyChanges: companyRequests.length,
      total: docs.length + companyRequests.length,
    }),
    [docs.length, companyRequests.length]
  );

  const showDocuments = filter === "all" || filter === "documents";
  const showCompanyChanges = filter === "all" || filter === "company_changes";

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin review center</h1>
          <p className="text-sm text-gray-600">
            Review pending documents and contractor company change requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="rounded border px-4 py-2 text-sm"
            href="/admin/company-change-requests"
          >
            View all company change requests
          </Link>

          <Link className="underline" href="/dashboard">
            Back
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded border px-4 py-2 text-sm ${
            filter === "all" ? "bg-black text-white" : ""
          }`}
          onClick={() => setFilter("all")}
        >
          All ({counts.total})
        </button>

        <button
          className={`rounded border px-4 py-2 text-sm ${
            filter === "documents" ? "bg-black text-white" : ""
          }`}
          onClick={() => setFilter("documents")}
        >
          Documents ({counts.documents})
        </button>

        <button
          className={`rounded border px-4 py-2 text-sm ${
            filter === "company_changes" ? "bg-black text-white" : ""
          }`}
          onClick={() => setFilter("company_changes")}
        >
          Company changes ({counts.companyChanges})
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && counts.total === 0 && (
        <p className="text-sm text-gray-600">No pending items.</p>
      )}

      {showDocuments && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Pending documents</h2>
              <p className="text-sm text-gray-600">
                COI and certifications waiting for review.
              </p>
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="rounded border p-4 text-sm text-gray-600">
              No pending documents.
            </div>
          ) : (
            <div className="grid gap-3">
              {docs.map((d) => (
                <div key={d.id} className="rounded border p-4">
                  <div className="flex items-center justify-between">
                    <b>{d.doc_kind.toUpperCase()}</b>
                    <span className="text-sm">pending</span>
                  </div>

                  <div className="mt-1 text-sm text-gray-600">
                    Expires: {d.expires_at}
                  </div>

                  <div className="mt-2">
                    <a
                      className="underline text-sm"
                      href={d.file_public_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open file
                    </a>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="rounded bg-black px-3 py-2 text-white"
                      onClick={() => onApprove(d.id)}
                    >
                      Approve
                    </button>

                    <input
                      className="rounded border p-2 text-sm"
                      placeholder="Reject reason (optional)"
                      value={rejectNote[d.id] || ""}
                      onChange={(e) =>
                        setRejectNote((prev) => ({
                          ...prev,
                          [d.id]: e.target.value,
                        }))
                      }
                    />

                    <button
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => onReject(d.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showCompanyChanges && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Pending company change requests
              </h2>
              <p className="text-sm text-gray-600">
                Contractor requests to update company data.
              </p>
            </div>

            <Link
              href="/admin/company-change-requests"
              className="rounded border px-4 py-2 text-sm"
            >
              View all
            </Link>
          </div>

          {companyRequests.length === 0 ? (
            <div className="rounded border p-4 text-sm text-gray-600">
              No pending company change requests.
            </div>
          ) : (
            <div className="rounded border overflow-hidden">
              <div className="grid grid-cols-5 gap-4 border-b bg-gray-50 p-3 text-sm font-medium">
                <div>Company</div>
                <div>DBA</div>
                <div>Status</div>
                <div>Created</div>
                <div></div>
              </div>

              {companyRequests.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-5 gap-4 border-b p-3 text-sm items-center"
                >
                  <div>{row.company?.legal_name || "—"}</div>
                  <div>{row.company?.dba_name || "—"}</div>
                  <div>
                    <span className="rounded border px-2 py-1 text-xs">
                      {row.status}
                    </span>
                  </div>
                  <div>{new Date(row.created_at).toLocaleString()}</div>
                  <div>
                    <Link
                      href={`/admin/company-change-requests/${row.id}`}
                      className="rounded border px-3 py-2 text-sm"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}