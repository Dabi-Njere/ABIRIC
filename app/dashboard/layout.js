import Link from "next/link";

const NAV = [
  { href: "/dashboard/discover", label: "Discover" },
  { href: "/dashboard/rfp", label: "RFP Generator" },
  { href: "/dashboard/pipeline", label: "Pipeline" },
  { href: "/dashboard/accounting", label: "Accounting" },
  { href: "/dashboard/admin", label: "Admin" },
];

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-abiric-black text-white">
      <aside className="w-56 shrink-0 bg-abiric-forestDark border-r border-abiric-accent/20 p-4">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-abiric-accentLight">ABIRIC</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400">
            Striving for Excellence
          </p>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-abiric-accent/20 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
