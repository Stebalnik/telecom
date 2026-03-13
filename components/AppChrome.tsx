"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  const isProtectedPage =
    pathname === "/dashboard" ||
    pathname.startsWith("/customer") ||
    pathname.startsWith("/contractor") ||
    pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F8FC] text-[#111827]">
      <header className="border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-base font-semibold">
            Telecom Marketplace
          </Link>

          <div className="flex items-center gap-2">
            {isAuthPage ? (
              <>
                {pathname !== "/login" ? (
                  <Link
                    href="/login"
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                  >
                    Log in
                  </Link>
                ) : null}

                {pathname !== "/signup" ? (
                  <Link
                    href="/signup"
                    className="rounded-xl bg-[#1F6FB5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0A2E5C]"
                  >
                    Sign up
                  </Link>
                ) : null}
              </>
            ) : null}

            {isProtectedPage ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                >
                  Dashboard
                </Link>

                <Link
                  href="/logout"
                  className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#F8FAFC]"
                >
                  Log out
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-[#D9E2EC] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-sm text-[#4B5563]">
          © {new Date().getFullYear()} LEOTEOR LLC
        </div>
      </footer>
    </div>
  );
}