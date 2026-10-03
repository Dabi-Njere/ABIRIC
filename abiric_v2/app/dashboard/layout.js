import Link from "next/link";

const NAV = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: "⌂",
    description: "Command centre",
  },
  {
    href: "/dashboard/opportunities",
    label: "Opportunities",
    icon: "☰",
    description: "List, search & import",
  },
  {
    href: "/dashboard/pipeline",
    label: "Pipeline",
    icon: "◇",
    description: "Stage workflow",
  },
  {
    href: "/dashboard/ledger",
    label: "Contracts",
    icon: "▤",
    description: "Fulfillment & finance",
  },
  {
    href: "/dashboard/accounting",
    label: "Accounting",
    icon: "$",
    description: "Financial records",
  },
];

// Discover (CanadaBuys search) and AI Drafting are demoted out of primary
// navigation — Discover's live-CSV integration is currently broken and not
// required for MVP; AI Drafting is optional and not part of the core
// operational workflow. Routes are left in place rather than deleted so
// nothing 404s and they can be restored to the nav later without rework.

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-abiric-black text-abiric-cream md:flex">

      {/* SIDEBAR */}
      <aside className="border-b border-white/10 bg-abiric-forestDark md:sticky md:top-0 md:h-screen md:w-[250px] md:shrink-0 md:border-b-0 md:border-r">

        <div className="flex h-full flex-col">

          {/* BRAND */}
          <div className="border-b border-white/10 px-5 py-6">
            <Link href="/dashboard" className="block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-abiric-salmon font-black text-abiric-black shadow-lg shadow-black/20">
                  A
                </div>

                <div>
                  <h1 className="text-lg font-black tracking-[0.14em] text-abiric-cream">
                    ABIRIC
                  </h1>
                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-abiric-salmonLight">
                    Striving for Excellence
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* NAVIGATION */}
          <nav className="flex gap-2 overflow-x-auto p-3 md:block md:flex-1 md:space-y-1 md:overflow-visible md:px-3 md:py-5">

            <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35 md:block">
              Workspace
            </p>

            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-w-max items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-abiric-salmon/20 hover:bg-white/[0.06] md:min-w-0"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-bold text-abiric-salmon transition group-hover:bg-abiric-salmon group-hover:text-abiric-black">
                  {item.icon}
                </span>

                <span>
                  <span className="block text-sm font-semibold text-white/85 transition group-hover:text-white">
                    {item.label}
                  </span>

                  <span className="hidden text-[10px] text-white/35 md:block">
                    {item.description}
                  </span>
                </span>
              </Link>
            ))}

            <div className="my-4 hidden border-t border-white/10 md:block" />

            <Link
              href="/dashboard/admin"
              className="group flex min-w-max items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-abiric-salmon/20 hover:bg-white/[0.06] md:min-w-0"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm text-abiric-salmon transition group-hover:bg-abiric-salmon group-hover:text-abiric-black">
                ⚙
              </span>

              <span>
                <span className="block text-sm font-semibold text-white/85">
                  Admin
                </span>
                <span className="hidden text-[10px] text-white/35 md:block">
                  Company settings
                </span>
              </span>
            </Link>
          </nav>

          {/* USER CARD */}
          <div className="hidden border-t border-white/10 p-4 md:block">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-abiric-salmon text-sm font-black text-abiric-black">
                  D
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-abiric-cream">
                    Dabi
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-abiric-salmon">
                    Administrator
                  </p>
                </div>

                <div className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* APPLICATION */}
      <section className="min-w-0 flex-1">

        {/* TOP BAR */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.07] bg-abiric-black/90 px-5 backdrop-blur-xl md:px-8">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-abiric-muted">
              ABIRIC INC.
            </p>
            <p className="text-sm font-medium text-abiric-cream">
              Business Operations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] text-emerald-300 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              System Online
            </span>

            <Link
              href="/dashboard/opportunities"
              className="rounded-xl bg-abiric-salmon px-4 py-2 text-xs font-bold text-abiric-black shadow-lg shadow-black/20 transition hover:bg-abiric-salmonLight"
            >
              + Opportunity
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="mx-auto w-full max-w-[1600px] p-5 md:p-8">
          {children}
        </main>

      </section>
    </div>
  );
}