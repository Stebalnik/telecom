"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { getMyProfile } from "../../../../lib/profile";

type Category =
  | "standard"
  | "sop"
  | "mop"
  | "training"
  | "safety"
  | "closeout"
  | "diagram"
  | "template"
  | "other";

type AudienceScope = "all_markets" | "selected_markets";

const categoryOptions: Category[] = [
  "standard",
  "sop",
  "mop",
  "training",
  "safety",
  "closeout",
  "diagram",
  "template",
  "other",
];

const marketOptions = [
  "FL",
  "GA",
  "NC",
  "SC",
  "TN",
  "AL",
  "KY",
  "OH",
  "IL",
  "KS",
  "NE",
  "CO",
  "WY",
];

export default function CustomerResourceNewPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("standard");
  const [revisionLabel, setRevisionLabel] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [audienceScope, setAudienceScope] = useState<AudienceScope>("all_markets");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!selectedFile) return false;
    if (audienceScope === "selected_markets" && selectedMarkets.length === 0) return false;
    return true;
  }, [title, selectedFile, audienceScope, selectedMarkets]);

  function toggleMarket(market: string) {
    setSelectedMarkets((prev) =>
      prev.includes(market) ? prev.filter((m) => m !== market) : [...prev, market]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!title.trim()) return setErr("Title is required.");
    if (!selectedFile) return setErr("Select a file.");
    if (audienceScope === "selected_markets" && selectedMarkets.length === 0) {
      return setErr("Select at least one market.");
    }

    setSaving(true);

    try {
      const profile = await getMyProfile();
      if (!profile || profile.role !== "customer") {
        throw new Error("Customer profile required.");
      }

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Not logged in.");

      const uploadRes = await fetch("/api/customer/resources/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
        }),
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadJson?.error || "Failed to prepare upload.");
      }

      const uploadFileRes = await fetch(uploadJson.signedUrl as string, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
        },
        body: selectedFile,
      });

      if (!uploadFileRes.ok) {
        throw new Error("Failed to upload file.");
      }

      const { data: resourceRow, error: resourceErr } = await supabase
        .from("customer_resources")
        .insert({
          id: uploadJson.resourceId,
          customer_id: uploadJson.customerId,
          title: title.trim(),
          description: description.trim() || null,
          category,
          file_name: selectedFile.name,
          file_path: uploadJson.path,
          mime_type: selectedFile.type || null,
          file_size_bytes: selectedFile.size,
          revision_label: revisionLabel.trim() || null,
          effective_date: effectiveDate || null,
          expires_at: expiresAt || null,
          is_required: isRequired,
          is_active: true,
          audience_scope: audienceScope,
          created_by: profile.id,
        })
        .select("id")
        .single();

      if (resourceErr || !resourceRow) {
        throw new Error(resourceErr?.message || "Failed to save resource row.");
      }

      if (audienceScope === "selected_markets" && selectedMarkets.length > 0) {
        const payload = selectedMarkets.map((market) => ({
          resource_id: resourceRow.id,
          market,
        }));

        const { error: marketsErr } = await supabase
          .from("customer_resource_markets")
          .insert(payload);

        if (marketsErr) {
          throw new Error(marketsErr.message);
        }
      }

      router.push("/customer/resources");
    } catch (e: any) {
      setErr(e.message ?? "Create resource error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2E5C]">
              Upload Contractor Resource
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
              Create a new standard, training file, safety note, or work instruction
              for approved contractors.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/customer/resources"
              className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
            >
              Back to Resources
            </Link>
          </div>
        </div>
      </section>

      {err ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {err}
        </section>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Resource Details</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#111827]">
                Title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="AT&T closeout standard v3"
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#111827]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short note describing where and when contractors should use this material."
                className="mt-2 min-h-[120px] w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              >
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Revision
              </label>
              <input
                value={revisionLabel}
                onChange={(e) => setRevisionLabel(e.target.value)}
                placeholder="v1.0"
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Effective date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Expiration date
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#D9E2EC] px-4 py-3 text-sm outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#111827]">
                File *
              </label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827]"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
              />
              {selectedFile ? (
                <p className="mt-2 text-xs text-[#6B7280]">
                  {selectedFile.name} · {Math.round(selectedFile.size / 1024)} KB
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#111827]">Visibility</h2>

          <div className="mt-4 space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#D9E2EC]"
              />
              <span className="text-sm text-[#111827]">
                Require acknowledgement from contractors
              </span>
            </label>

            <div>
              <label className="block text-sm font-medium text-[#111827]">
                Market scope
              </label>

              <div className="mt-3 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="radio"
                    name="audienceScope"
                    checked={audienceScope === "all_markets"}
                    onChange={() => setAudienceScope("all_markets")}
                  />
                  All markets
                </label>

                <label className="flex items-center gap-2 text-sm text-[#111827]">
                  <input
                    type="radio"
                    name="audienceScope"
                    checked={audienceScope === "selected_markets"}
                    onChange={() => setAudienceScope("selected_markets")}
                  />
                  Selected markets only
                </label>
              </div>
            </div>

            {audienceScope === "selected_markets" ? (
              <div>
                <div className="text-sm font-medium text-[#111827]">Markets *</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {marketOptions.map((market) => {
                    const active = selectedMarkets.includes(market);

                    return (
                      <button
                        key={market}
                        type="button"
                        onClick={() => toggleMarket(market)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "border-[#1F6FB5] bg-[#EAF4FF] text-[#0A2E5C]"
                            : "border-[#D9E2EC] bg-white text-[#111827] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {market}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#4B5563]">
              Resource will be visible to approved contractors only.
            </div>

            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="inline-flex items-center justify-center rounded-xl bg-[#1F6FB5] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Uploading..." : "Save Resource"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}