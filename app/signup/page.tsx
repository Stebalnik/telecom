"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  getSanitizedAuthErrorDetails,
  isAuthNetworkError,
} from "../../lib/authDiagnostics";
import { normalizeError } from "../../lib/errors/normalizeError";
import { withErrorLogging } from "../../lib/errors/withErrorLogging";
import { supabase } from "../../lib/supabaseClient";
import { track } from "../../lib/track";

function getErrorMessage(error: unknown) {
  if (isAuthNetworkError(error)) {
    return "Authentication service is temporarily unavailable. Please try again shortly.";
  }

  const normalized = normalizeError(error);
  const message = String(normalized.message || "").toLowerCase();

  if (message.includes("user already registered")) {
    return "An account with this email already exists.";
  }

  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }

  return "Unable to create account. Please try again.";
}

function getEmailRedirectTo() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/dashboard`;
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupShell />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFastContractorSignup = searchParams.get("role") === "contractor";
  const redirectTimeoutRef = useRef<number | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [homeMarket, setHomeMarket] = useState("");
  const [serviceScopes, setServiceScopes] = useState("");
  const [crewSize, setCrewSize] = useState("");
  const [primaryCertifications, setPrimaryCertifications] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

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

    if (isFastContractorSignup) {
      if (!companyName.trim()) {
        setError("Please enter your company name.");
        setLoading(false);
        return;
      }

      if (!contactName.trim()) {
        setError("Please enter a contact name.");
        setLoading(false);
        return;
      }
    }

    try {
      const contractorMetadata = isFastContractorSignup
        ? {
            signup_mode: "fast_contractor",
            requested_role: "contractor",
            company_name: companyName.trim(),
            contact_name: contactName.trim(),
            phone: phone.trim() || null,
            home_market: homeMarket.trim() || null,
            service_scopes: splitList(serviceScopes),
            crew_size: crewSize.trim() || null,
            primary_certifications: splitList(primaryCertifications),
          }
        : {};
      const { data } = await withErrorLogging(
        async () => {
          const result = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: getEmailRedirectTo(),
              data: contractorMetadata,
            },
          });

          if (result.error) {
            throw result.error;
          }

          return result;
        },
        {
          message: "signup_failed",
          code: "signup_failed",
          source: "frontend",
          area: "auth",
          path: "/signup",
        }
      );

      await track(isFastContractorSignup ? "contractor_fast_signup_completed" : "signup", {
        meta: {
          userId: data.user?.id ?? null,
          mode: isFastContractorSignup ? "fast_contractor" : "standard",
        },
      });

      setMessage(
        "Account created successfully. Check your email if confirmation is required, then log in."
      );

      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setCompanyName("");
      setContactName("");
      setPhone("");
      setHomeMarket("");
      setServiceScopes("");
      setCrewSize("");
      setPrimaryCertifications("");

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      redirectTimeoutRef.current = window.setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err) {
      console.warn("signup_auth_failed", getSanitizedAuthErrorDetails(err));
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#D9E2EC] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111827]">
          {isFastContractorSignup ? "Join as a contractor" : "Sign up"}
        </h1>

        <p className="mt-2 text-sm text-[#4B5563]">
          {isFastContractorSignup
            ? "Create a marketplace profile now. Complete insurance, certifications, and team documents later."
            : "Create your account to access the Telecom Marketplace."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {isFastContractorSignup ? (
            <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FBFF] p-4">
              <h2 className="text-sm font-semibold text-[#0A2E5C]">
                Fast contractor profile
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <TextField
                  id="companyName"
                  label="Company name"
                  value={companyName}
                  onChange={setCompanyName}
                  placeholder="Example Telecom LLC"
                  required
                />
                <TextField
                  id="contactName"
                  label="Contact name"
                  value={contactName}
                  onChange={setContactName}
                  placeholder="Primary contact"
                  required
                />
                <TextField
                  id="phone"
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="Optional"
                />
                <TextField
                  id="homeMarket"
                  label="Home market"
                  value={homeMarket}
                  onChange={setHomeMarket}
                  placeholder="Dallas, TX"
                />
                <TextField
                  id="serviceScopes"
                  label="Service scopes"
                  value={serviceScopes}
                  onChange={setServiceScopes}
                  placeholder="Tower work, fiber, closeout"
                />
                <TextField
                  id="crewSize"
                  label="Crew size"
                  value={crewSize}
                  onChange={setCrewSize}
                  placeholder="4"
                />
                <div className="md:col-span-2">
                  <TextField
                    id="primaryCertifications"
                    label="Primary certifications"
                    value={primaryCertifications}
                    onChange={setPrimaryCertifications}
                    placeholder="OSHA 30, RF Awareness, First Aid"
                  />
                </div>
              </div>
            </div>
          ) : null}

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

function SignupShell() {
  return (
    <main className="min-h-screen bg-[#F4F8FC] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#D9E2EC] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#111827]">Sign up</h1>
        <p className="mt-2 text-sm text-[#4B5563]">Loading signup form...</p>
      </div>
    </main>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#111827]"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-[#D9E2EC] bg-white px-4 py-3 outline-none transition focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#2EA3FF]/20"
        placeholder={placeholder}
      />
    </div>
  );
}
