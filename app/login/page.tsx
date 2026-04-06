"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { track } from "../../lib/track";

function getErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }

  return message;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;
        if (error) throw error;

        if (data.session?.user) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
      } catch {
        // ignore and allow login form
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setLoading(false);
      setError(getErrorMessage(error.message));
      return;
    }

    await track("login", {
      meta: {
        email: normalizedEmail,
        userId: data.user?.id ?? null,
      },
    });

    router.replace("/dashboard");
    router.refresh();
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#F4F8FC] px-4 py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-[#D9E2EC] bg-white p-8 shadow-sm">
          <p className="text-sm text-[#4B5563]">Checking session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-[#D9E2EC] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#0A2E5C]">Log in</h1>

        <p className="mt-2 text-sm text-[#4B5563]">
          Sign in to access your Telecom Marketplace account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-[#0A2E5C]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#0A2E5C]"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-[#1F6FB5] hover:text-[#0A2E5C] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 text-[#111827] outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              placeholder="Enter your password"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1F6FB5] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0A2E5C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#4B5563]">
          No account?{" "}
          <Link
            href="/signup"
            className="text-[#1F6FB5] hover:text-[#0A2E5C] hover:underline"
          >
            Create one
          </Link>
        </div>
      </div>
    </main>
  );
}