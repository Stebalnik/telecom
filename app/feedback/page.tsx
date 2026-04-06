"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type FeedbackItem = {
  id: string;
  created_at: string;
  updated_at?: string;
  role?: string | null;
  source?: string;
  category: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  path?: string | null;
  last_message_at?: string | null;
  reviewed_at?: string | null;
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

type FeedbackApiResponse = {
  items?: FeedbackItem[];
  error?: string;
};

const categoryOptions = [
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Feature request" },
  { value: "ux_issue", label: "UX issue" },
  { value: "billing", label: "Billing" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
] as const;

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
] as const;

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

export default function FeedbackPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [hasSession, setHasSession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [reply, setReply] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const source = useMemo(() => {
    if (pathname === "/") return "landing";
    if (pathname === "/login") return "login";
    if (pathname === "/signup") return "signup";
    if (pathname === "/dashboard") return "dashboard";
    if (pathname.startsWith("/customer")) return "customer";
    if (pathname.startsWith("/contractor")) return "contractor";
    if (pathname.startsWith("/admin")) return "admin";
    return "public";
  }, [pathname]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setHasSession(!!data.session?.user);
      } finally {
        if (mounted) setSessionChecked(true);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session?.user);
      setSessionChecked(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadFeedback() {
    setLoadingItems(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "GET",
        cache: "no-store",
      });

      const data: FeedbackApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load feedback.");
      }

      const nextItems = data.items || [];
      setItems(nextItems);

      if (nextItems.length > 0) {
        setSelectedId((current) =>
          current && nextItems.some((item) => item.id === current)
            ? current
            : nextItems[0].id
        );
      } else {
        setSelectedId(null);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  }

  async function loadMessages(feedbackId: string) {
    setLoadingMessages(true);
    setThreadError(null);

    try {
      const res = await fetch(`/api/feedback/${feedbackId}/messages`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to load thread.");
      }

      setMessages(data.messages || []);
    } catch (e: any) {
      setThreadError(e?.message || "Unable to load thread.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function submitFeedback() {
    setError(null);
    setSubmitSuccess(null);

    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }

    if (!message.trim()) {
      setError("Message is required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          subject,
          message,
          priority,
          source,
          path: pathname,
          guest_name: guestName.trim() || undefined,
          guest_email: guestEmail.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to send feedback.");
      }

      const createdId = data?.item?.id ?? null;

      setSubject("");
      setMessage("");
      setPriority("normal");
      setCategory("other");
      setSubmitSuccess("Feedback sent successfully.");

      await loadFeedback();

      if (createdId && hasSession) {
        setSelectedId(createdId);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Unable to send feedback.");
    } finally {
      setLoading(false);
    }
  }

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;

    setSendingReply(true);
    setThreadError(null);

    try {
      const res = await fetch(`/api/feedback/${selectedId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: reply,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to send reply.");
      }

      setReply("");
      await loadMessages(selectedId);
      await loadFeedback();
    } catch (e: any) {
      setThreadError(e?.message || "Unable to send reply.");
    } finally {
      setSendingReply(false);
    }
  }

  useEffect(() => {
    loadFeedback();
  }, []);

  useEffect(() => {
    if (selectedId && hasSession) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
      setThreadError(null);
    }
  }, [selectedId, hasSession]);

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push(hasSession ? "/dashboard" : "/");
                  }
                }}
                className="mb-4 rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F8FAFC]"
              >
                Back
              </button>

              <h1 className="text-2xl font-semibold text-[#0A2E5C]">Feedback</h1>
              <p className="mt-2 text-sm text-[#4B5563]">
                Report an issue, request a feature, or share an improvement idea
                for LEOTEOR Telecom Marketplace.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A2E5C]">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary of your feedback"
                  className="mt-2 w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0A2E5C]">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue, request, or idea in as much detail as possible."
                  className="mt-2 min-h-[180px] w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {submitSuccess ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  {submitSuccess}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={submitFeedback}
                  disabled={loading}
                  className="rounded-xl bg-[#2EA3FF] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1F6FB5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send feedback"}
                </button>

                <div className="text-xs text-[#6B7280]">
                  Source: <span className="font-medium">{source}</span>
                  {pathname ? (
                    <>
                      {" "}
                      · Path: <span className="font-medium">{pathname}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-5">
              <h2 className="text-base font-semibold text-[#0A2E5C]">
                Optional contact details
              </h2>
              <p className="mt-2 text-sm text-[#4B5563]">
                Add these if you want us to follow up faster, especially when
                you are not signed in.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Your name"
                    className="mt-2 w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A2E5C]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
                  />
                </div>

                {!sessionChecked ? null : !hasSession ? (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4 text-sm text-[#4B5563]">
                    You can submit feedback without signing in. Message threads
                    and replies are available when you are logged in.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#D9E2EC] bg-white p-4 text-sm text-[#4B5563]">
                    You are signed in. You can view your feedback history and
                    reply to admin messages below.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0A2E5C]">
                  Your feedback
                </h2>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Recent feedback items associated with your account.
                </p>
              </div>
            </div>

            {loadingItems ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                Loading feedback...
              </div>
            ) : items.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                No feedback yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((item) => {
                  const active = item.id === selectedId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`block w-full rounded-2xl border p-5 text-left shadow-sm transition ${
                        active
                          ? "border-[#BFDBFE] bg-[#EAF4FF]"
                          : "border-[#D9E2EC] bg-white hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#111827]">
                            {item.subject}
                          </h3>
                          <StatusBadge status={item.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                          <span className="rounded-full border border-[#D9E2EC] bg-white px-2 py-1">
                            {item.category.replaceAll("_", " ")}
                          </span>
                          <span className="rounded-full border border-[#D9E2EC] bg-white px-2 py-1">
                            priority: {item.priority}
                          </span>
                          {item.source ? (
                            <span className="rounded-full border border-[#D9E2EC] bg-white px-2 py-1">
                              {item.source}
                            </span>
                          ) : null}
                        </div>

                        <div className="line-clamp-3 text-sm text-[#111827]">
                          {item.message}
                        </div>

                        <div className="text-xs text-[#6B7280]">
                          Last activity: {formatDate(item.last_message_at)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-[#0A2E5C]">
                Thread
              </h2>
              <p className="mt-1 text-sm text-[#4B5563]">
                View conversation.
              </p>
            </div>

            {!sessionChecked ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                Checking session...
              </div>
            ) : !hasSession ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                Sign in to view your feedback thread and reply to admin messages.
              </div>
            ) : !selectedItem ? (
              <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                Select a feedback item to view the thread.
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#111827]">
                      {selectedItem.subject}
                    </h3>
                    <StatusBadge status={selectedItem.status} />
                  </div>
                  <div className="mt-2 text-xs text-[#6B7280]">
                    Created: {formatDate(selectedItem.created_at)}
                  </div>
                </div>

                {loadingMessages ? (
                  <div className="mt-4 rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                    Loading thread...
                  </div>
                ) : threadError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {threadError}
                  </div>
                ) : (
                  <>
                    <div className="mt-4 space-y-3">
                      {messages.length === 0 ? (
                        <div className="rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
                          No messages yet.
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isAdmin = msg.sender_role === "admin";

                          return (
                            <div
                              key={msg.id}
                              className={`rounded-2xl border p-4 ${
                                isAdmin
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-[#D9E2EC] bg-[#F8FAFC]"
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                                <span className="font-medium text-[#111827]">
                                  {isAdmin ? "Admin" : "You"}
                                </span>
                                <span>{formatDate(msg.created_at)}</span>
                              </div>

                              <div className="mt-2 whitespace-pre-wrap text-sm text-[#111827]">
                                {msg.body}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-6">
  <label className="block text-sm font-medium text-[#0A2E5C]">
    Reply
  </label>

  {selectedItem.status === "closed" ? (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      This thread is closed. You cannot send new messages.
    </div>
  ) : null}

  <textarea
    value={reply}
    onChange={(e) => setReply(e.target.value)}
    placeholder="Add more details or reply to admin."
    disabled={selectedItem.status === "closed"}
    className="mt-2 min-h-[140px] w-full rounded-2xl border border-[#D9E2EC] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20 disabled:bg-[#F8FAFC] disabled:text-[#6B7280] disabled:cursor-not-allowed"
  />

                      <div className="mt-4">
                        <button
                          onClick={sendReply}
                          disabled={sendingReply || selectedItem.status === "closed"}


                          className="rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sendingReply ? "Sending..." : "Send reply"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}