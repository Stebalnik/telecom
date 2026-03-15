"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

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

  const homeHref = isProtectedPage ? "/dashboard" : "/";

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F8FC] text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-[#D9E2EC] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-3 rounded-xl transition hover:opacity-90"
            aria-label="Go to home"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#D9E2EC] bg-white shadow-sm">
              <Image
                src="/logo.png"
                alt="LEOTEOR logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-[0.08em] text-[#0A2E5C]">
                LEOTEOR
              </div>
              <div className="truncate text-xs text-[#4B5563]">
                Telecom Marketplace
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthPage ? (
              <>
                {pathname !== "/login" ? (
                  <Link
                    href="/login"
                    className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#0A2E5C] shadow-sm transition hover:border-[#1F6FB5] hover:bg-[#F8FBFF]"
                  >
                    Log in
                  </Link>
                ) : null}

                {pathname !== "/signup" ? (
                  <Link
                    href="/signup"
                    className="rounded-xl bg-[#2EA3FF] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#1F6FB5]"
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
                  className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm font-medium text-[#0A2E5C] shadow-sm transition hover:border-[#1F6FB5] hover:bg-[#F8FBFF]"
                >
                  Dashboard
                </Link>

                <LogoutButton />
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-[#4B5563] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} LEOTEOR LLC</div>

          <div className="flex items-center gap-4">
            <a
              href="https://leoteor.com"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[#1F6FB5]"
            >
              leoteor.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}