import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#F4F8FC]">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="text-base md:text-lg font-semibold text-[#0A2E5C]">
          Telecom Marketplace
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-[#D9E2EC] bg-white px-4 py-2 text-sm text-[#111827] shadow-sm hover:bg-[#F8FBFF]"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="rounded-xl bg-[#1F6FB5] px-4 py-2 text-sm text-white shadow-sm hover:bg-[#185f9c]"
          >
            Sign up
          </Link>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-6xl grid gap-10 md:grid-cols-2 md:items-center">
          <div className="flex justify-center md:justify-center order-1">
            <div className="w-full max-w-xl rounded-[28px] border border-[#D9E2EC] bg-white shadow-sm p-6 md:p-10">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-[#EAF3FB] flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Telecom Marketplace"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="text-center md:text-left order-2">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#0A2E5C]">
              Telecom Marketplace
            </h1>

            <p className="mt-5 text-base md:text-lg text-[#4B5563] max-w-xl mx-auto md:mx-0">
              Connect telecom customers with verified contractors, manage
              certifications, insurance, crews, and jobs in one platform.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                href="/signup"
                className="rounded-xl bg-[#1F6FB5] px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#185f9c]"
              >
                Get Started
              </Link>

              <Link
                href="/login"
                className="rounded-xl border border-[#D9E2EC] bg-white px-6 py-3 text-sm font-medium text-[#111827] shadow-sm hover:bg-[#F8FBFF]"
              >
                Login
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
                Verified contractors
              </div>
              <div className="rounded-xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
                Insurance compliance
              </div>
              <div className="rounded-xl border border-[#D9E2EC] bg-white p-4 shadow-sm">
                Job management
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#D9E2EC] px-6 py-6">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-sm text-[#4B5563]">
          <div>© 2023-2026 LEOTEOR LLC. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-[#0A2E5C]">
              Terms
            </a>
            <a href="#" className="hover:text-[#0A2E5C]">
              Privacy
            </a>
            <a href="#" className="hover:text-[#0A2E5C]">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}