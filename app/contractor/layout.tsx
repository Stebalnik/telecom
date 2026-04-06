"use client";

import type { ReactNode } from "react";
import ContractorSidebar from "../../components/ContractorSidebar";

export default function ContractorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F4F8FC]">
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-[260px] shrink-0 md:block">
          <ContractorSidebar />
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}