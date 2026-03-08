"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { getMyProfile } from "../../../lib/profile";

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

export default function AdminCompanyChangeRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);

  async function loadPage() {
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

      const { data: requests, error } = await supabase
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
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      const normalized = ((requests ?? []) as RequestRowDb[]).map(mapRequestRow);
      setRows(normalized);
    } catch (e: any) {
      setErr(e.message ?? "Load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <main className="p-6">Loading...</main>;
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Company change requests</h1>
          <p className="text-sm text-gray-600">
            Review contractor requests to update company data.
          </p>
        </div>

        <Link href="/admin" className="underline">
          Back
        </Link>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="rounded border overflow-hidden">
        <div className="grid grid-cols-5 gap-4 border-b bg-gray-50 p-3 text-sm font-medium">
          <div>Company</div>
          <div>DBA</div>
          <div>Status</div>
          <div>Created</div>
          <div></div>
        </div>

        {rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No requests yet.</div>
        ) : (
          rows.map((row) => (
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
          ))
        )}
      </div>
    </main>
  );
}