"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FeedbackItem = {
  id: string;
  created_at: string;
  role?: string | null;
  source?: string;
  category?: string;
  subject?: string;
  message: string;
  priority?: string;
  status: string;
  path?: string | null;
  last_message_at?: string | null;
  actor_name?: string;
  actor_type?: string;
};

type FeedbackMessage = {
  id: string;
  feedback_id: string;
  created_at: string;
  sender_user_id?: string | null;
  sender_role: string;
  body: string;
  is_internal: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "resolved"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "closed"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : status === "planned"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : status === "waiting_for_user"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : status === "in_review"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-[#D9E2EC] bg-[#F8FBFF] text-[#0A2E5C]";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${styles}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [feedbackId, setFeedbackId] = useState<string>("");
  const [item, setItem] = useState<FeedbackItem | null>(null);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("in_review");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setFeedbackId(resolved.id);
    }
    resolveParams();
  }, [params]);

    async function load() {
  if (!feedbackId) return;

  setLoading(true);
  setErr(null);

  try {
    const [itemRes, messagesRes] = await Promise.all([
      fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "GET",
        cache: "no-store",
      }),
      fetch(`/api/feedback/${feedbackId}/messages`, {
        method: "GET",
        cache: "no-store",
      }),
    ]);

    const itemJson = await itemRes.json();
    const messagesJson = await messagesRes.json();

    if (!itemRes.ok) {
      throw new Error(itemJson?.error || "Unable to load feedback.");
    }

    if (!messagesRes.ok) {
      throw new Error(messagesJson?.error || "Unable to load messages.");
    }

    const nextItem = itemJson.item as FeedbackItem;
    const nextMessages = messagesJson.messages || [];

    setItem(nextItem);
    setStatus(nextItem.status || "in_review");
    setMessages(nextMessages);

    if (nextItem.status !== "closed") {
      const nextStatus =
        nextItem.status === "new" ? "in_review" : nextItem.status;

      const patchRes = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const patchJson = await patchRes.json().catch(() => ({}));

      if (!patchRes.ok) {
        throw new Error(
          patchJson?.error || "Unable to mark feedback as reviewed."
        );
      }

      setItem({
        ...nextItem,
        status: nextStatus,
        reviewed_at: new Date().toISOString(),
      } as FeedbackItem);

      setStatus(nextStatus);
    }
  } catch (e: any) {
    setErr(e?.message || "Unable to load feedback.");
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    load();
  }, [feedbackId]);

  async function handleReply() {
    if (!reply.trim()) return;
    if (!feedbackId) return;

    setSending(true);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: reply,
          status: "waiting_for_user",
          is_internal: false,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Unable to send reply.");
      }

      setReply("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Unable to send reply.");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusSave() {
    if (!feedbackId) return;

    setSavingStatus(true);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Unable to update status.");
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || "Unable to update status.");
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#0A2E5C]">
                Feedback detail
              </h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Review the thread, request more information, or resolve the issue.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/feedback"
                className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F8FAFC]"
              >
                Back to feedback
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm text-sm text-[#4B5563]">
            Loading feedback...
          </section>
        ) : err ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {err}
          </section>
        ) : item ? (
          <>
            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#111827]">
                      {item.subject || "Untitled feedback"}
                    </h2>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                    {item.actor_name ? (
                      <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1">
                        {item.actor_name}
                      </span>
                    ) : null}
                    {item.actor_type ? (
                      <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1">
                        {item.actor_type}
                      </span>
                    ) : null}
                    {item.category ? (
                      <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1">
                        {item.category.replaceAll("_", " ")}
                      </span>
                    ) : null}
                    {item.priority ? (
                      <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1">
                        priority: {item.priority}
                      </span>
                    ) : null}
                    {item.source ? (
                      <span className="rounded-full border border-[#D9E2EC] bg-[#F8FAFC] px-2 py-1">
                        {item.source}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 whitespace-pre-wrap text-sm text-[#111827]">
                    {item.message}
                  </div>

                  {item.path ? (
                    <div className="mt-3 text-xs text-[#6B7280]">
                      Path: {item.path}
                    </div>
                  ) : null}
                </div>

                <div className="text-xs text-[#6B7280] lg:text-right">
                  <div>Created: {formatDate(item.created_at)}</div>
                  <div>Last activity: {formatDate(item.last_message_at)}</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#0A2E5C]">Status</h3>
                  <p className="mt-1 text-sm text-[#4B5563]">
                    Update the current state of this feedback item.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                  >
                    <option value="in_review">In review</option>
                    <option value="waiting_for_user">Waiting for user</option>
                    <option value="planned">Planned</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    onClick={handleStatusSave}
                    disabled={savingStatus}
                    className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingStatus ? "Saving..." : "Save status"}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#0A2E5C]">Thread</h3>

              <div className="mt-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    No messages yet.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-2xl border p-4 ${
                        msg.sender_role === "admin"
                          ? "border-blue-200 bg-blue-50"
                          : "border-[#D9E2EC] bg-[#F8FAFC]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                        <span className="font-medium text-[#111827]">
                          {msg.sender_role}
                        </span>
                        <span>{formatDate(msg.created_at)}</span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-[#111827]">
                        {msg.body}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-[#0A2E5C]">
                  Reply to user
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Ask for more details or provide an update."
                  className="mt-2 min-h-[140px] w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                />

                <div className="mt-4">
                  <button
                    onClick={handleReply}
                    disabled={sending}
                    className="rounded-xl bg-[#2EA3FF] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1F6FB5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? "Sending..." : "Send reply"}
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm text-sm text-[#4B5563]">
            Feedback not found.
          </section>
        )}
      </div>
    </main>
  );
}