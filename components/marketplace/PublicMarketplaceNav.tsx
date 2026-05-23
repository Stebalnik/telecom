import Link from "next/link";

const navItems = [
  { href: "/marketplace", label: "Overview" },
  { href: "/marketplace/jobs", label: "Jobs" },
  { href: "/marketplace/contractors", label: "Contractors" },
  { href: "/markets", label: "Markets" },
  { href: "/marketplace/activity", label: "Activity" },
];

export default function PublicMarketplaceNav() {
  return (
    <nav className="border-y border-[#D9E2EC] bg-white/95">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-3 md:px-10">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[#0A2E5C] transition hover:bg-[#F4F8FC]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
