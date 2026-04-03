"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function MissionPage() {
  const [amount, setAmount] = useState<number>(13);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const finalAmount =
    custom.trim() !== "" && Number(custom) > 0
      ? Number(custom)
      : amount;

  async function handleDonate() {
    setLoading(true);
    setErr(null);

    try {
      const { data } = await supabase.auth.getSession();

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalAmount,
          email: data.session?.user?.email ?? null,
          purpose: "mission_support",
          successPath: "/mission",
          cancelPath: "/mission",
          title: "Support LEOTEOR Mission",
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json?.error);
      window.location.href = json.url;
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* MISSION */}
        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-[#0A2E5C]">
            Our Mission
          </h1>

          <p className="mt-4 text-[#4B5563] leading-7">
            LEOTEOR is building a more direct, transparent, and efficient way
            for customers and contractors to work together in telecom.
          </p>

          <p className="mt-4 text-[#111827] leading-7">
            Today, telecom projects often pass through multiple layers before
            reaching the teams who actually perform the work. This creates
            delays, reduces transparency, and disconnects decision-makers from
            real execution.
          </p>

          <p className="mt-4 text-[#111827] leading-7">
            Our goal is to create the most convenient platform for interaction
            between customers and contractors — where teams can be hired faster,
            compliance is clear, and execution becomes more efficient.
          </p>

          <p className="mt-4 text-[#111827] leading-7">
            We focus on improving coordination, trust, and real productivity in
            telecom — without unnecessary friction.
          </p>
        </section>

        {/* DONATION */}
        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[#111827]">
            Support the Mission
          </h2>

          <p className="mt-2 text-sm text-[#4B5563]">
            You can support the development of LEOTEOR with a one-time payment.
          </p>

          <div className="mt-5 flex gap-3 flex-wrap">
            {[13, 25, 50].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setAmount(v);
                  setCustom("");
                }}
                className={`px-4 py-2 rounded-xl text-sm ${
                  amount === v && custom === ""
                    ? "bg-[#1F6FB5] text-white"
                    : "border"
                }`}
              >
                ${v}
              </button>
            ))}
          </div>

          <div className="mt-4 max-w-xs">
            <input
              type="number"
              placeholder="Custom amount"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          {err && (
            <div className="mt-4 text-red-600 text-sm">{err}</div>
          )}

          <button
            onClick={handleDonate}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[#2EA3FF] py-3 text-white"
          >
            {loading ? "Opening..." : `Support $${finalAmount}`}
          </button>
        </section>

      </div>
    </main>
  );
}