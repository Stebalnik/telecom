"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile } from "../../lib/profile";
import { supabase } from "../../lib/supabaseClient";
import { approveDoc, listPendingDocs, rejectDoc, AdminDoc } from "../../lib/adminDocs";

export default function AdminPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setErr(null);

    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.replace("/login");

    const profile = await getMyProfile();
    if (!profile || profile.role !== "admin") return router.replace("/dashboard");

    try {
      const d = await listPendingDocs();
      setDocs(d);
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

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin: Document verification</h1>
        <a className="underline" href="/dashboard">Back</a>
      </div>

      {loading && <p>Loading...</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {docs.length === 0 && !loading && (
        <p className="text-sm text-gray-600">No pending documents.</p>
      )}

      <div className="grid gap-3">
        {docs.map((d) => (
          <div key={d.id} className="rounded border p-4">
            <div className="flex items-center justify-between">
              <b>{d.doc_kind.toUpperCase()}</b>
              <span className="text-sm">pending</span>
            </div>

            <div className="mt-1 text-sm text-gray-600">Expires: {d.expires_at}</div>

            <div className="mt-2">
              <a className="underline text-sm" href={d.file_public_url} target="_blank">
                Open file
              </a>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded bg-black px-3 py-2 text-white" onClick={() => onApprove(d.id)}>
                Approve
              </button>

              <input
                className="rounded border p-2 text-sm"
                placeholder="Reject reason (optional)"
                value={rejectNote[d.id] || ""}
                onChange={(e) => setRejectNote((prev) => ({ ...prev, [d.id]: e.target.value }))}
              />

              <button className="rounded border px-3 py-2 text-sm" onClick={() => onReject(d.id)}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
