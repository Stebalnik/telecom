"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { track } from "../../lib/track";
import { logError } from "../../lib/logError";

function getErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("user already registered")) {
    return "An account with this email already exists.";
  }

  if (normalized.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }

  return "Unable to create account. Please try again.";
}

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        await logError("signup_failed", {
          source: "frontend",
          area: "auth",
          path: "/signup",
          code: "signup_failed",
          details: {
            message: error.message,
            email: normalizedEmail,
          },
        });

        setError(getErrorMessage(error.message));
        setLoading(false);
        return;
      }

      await track("signup", {
        meta: {
          userId: data.user?.id ?? null,
        },
      });

      setMessage(
        "Account created successfully. Check your email if confirmation is required, then log in."
      );

      setEmail("");
      setPassword("");
      setConfirmPassword("");

      setLoading(false);

      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (e: any) {
      await logError("signup_exception", {
        source: "frontend",
        area: "auth",
        path: "/signup",
        code: "signup_exception",
        details: {
          message: e?.message || "Unknown error",
          email: normalizedEmail,
        },
      });

      setError("Unable to create account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-[#D9E2EC] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111827]">Sign up</h1>

        <p className="mt-2 text-sm text-[#4B5563]">
          Create your account to access the Telecom Marketplace.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-[#111827]"
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
              className="w-full rounded-xl border border-[#D9E2EC] px-4 py-3 outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[#D9E2EC] px-4 py-3 outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-[#111827]"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[#D9E2EC] px-4 py-3 outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
              placeholder="Repeat your password"
            />
          </div>

          {message ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          ) : null}

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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#4B5563]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1F6FB5] hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}