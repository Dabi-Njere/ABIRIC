import Link from "next/link";

const KPI_CARDS = [
  {
    label: "Pipeline Value",
    value: "$0",
    detail: "Qualified opportunities",
    accent: "salmon",
  },
  {
    label: "Active Bids",
    value: "0",
    detail: "Currently in progress",
    accent: "green",
  },
  {
    label: "Contracts Won",
    value: "0",
    detail: "Awarded contracts",
    accent: "green",
  },
  {
    label: "Receivables",
    value: "$0",
    detail: "Outstanding invoices",
    accent: "salmon",
  },
];

const QUICK_ACTIONS = [
  {
    href: "/dashboard/discover",
    title: "Find Opportunities",
    description: "Search and qualify new government opportunities.",
    icon: "⌕",
  },
  {
    href: "/dashboard/pipeline",
    title: "Review Pipeline",
    description: "Track opportunities from qualification through award.",
    icon: "◇",
  },
  {
    href: "/dashboard/ledger",
    title: "Open Ledger",
    description: "Manage contract revenue, costs and fulfillment.",
    icon: "▤",
  },
  {
    href: "/dashboard/rfp",
    title: "Draft Response",
    description: "Use AI assistance for procurement response drafting.",
    icon: "✦",
  },
];

export default function DashboardHome() {
  return (
    <div className="space-y-8">

      {/* HERO */}
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-abiric-salmon" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-abiric-salmon">
              Command Centre
            </p>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-abiric-cream lg:text-4xl">
            Good morning, Dabi.
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-abiric-muted">
            Your procurement, contract delivery and financial operations in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/ledger"
            className="abiric-button-secondary"
          >
            View Ledger
          </Link>

          <Link
            href="/dashboard/discover"
            className="abiric-button"
          >
            + Track Opportunity
          </Link>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-abiric-surface p-5 transition hover:-translate-y-0.5 hover:border-abiric-salmon/25"
          >
            <div
              className={`absolute left-0 top-0 h-full w-1 ${
                card.accent === "salmon"
                  ? "bg-abiric-salmon"
                  : "bg-abiric-forestSoft"
              }`}
            />

            <div className="flex items-start justify-between">
              <p className="abiric-label">{card.label}</p>

              <span
                className={`h-2 w-2 rounded-full ${
                  card.accent === "salmon"
                    ? "bg-abiric-salmon"
                    : "bg-emerald-400"
                }`}
              />
            </div>

            <p className="mt-5 text-3xl font-bold tracking-tight text-abiric-cream">
              {card.value}
            </p>

            <p className="mt-2 text-xs text-abiric-muted">
              {card.detail}
            </p>
          </div>
        ))}
      </section>

      {/* MAIN OPERATING AREA */}
      <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">

        {/* PIPELINE */}
        <div className="abiric-card">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
            <div>
              <p className="abiric-label">Procurement</p>
              <h2 className="mt-1 text-lg font-semibold text-abiric-cream">
                Active Pipeline
              </h2>
            </div>

            <Link
              href="/dashboard/pipeline"
              className="text-xs font-semibold text-abiric-salmon transition hover:text-abiric-salmonLight"
            >
              View pipeline →
            </Link>
          </div>

          <div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-abiric-salmon/20 bg-abiric-salmon/10 text-xl text-abiric-salmon">
              ◇
            </div>

            <h3 className="mt-4 text-sm font-semibold text-abiric-cream">
              No active opportunities yet
            </h3>

            <p className="mt-2 max-w-sm text-xs leading-5 text-abiric-muted">
              Qualified opportunities and active bids will appear here as you build the ABIRIC pipeline.
            </p>

            <Link
              href="/dashboard/discover"
              className="mt-5 text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight"
            >
              Discover opportunities →
            </Link>
          </div>
        </div>

        {/* DEADLINES */}
        <div className="abiric-card">
          <div className="border-b border-white/[0.07] pb-4">
            <p className="abiric-label">Attention</p>
            <h2 className="mt-1 text-lg font-semibold text-abiric-cream">
              Upcoming Deadlines
            </h2>
          </div>

          <div className="flex min-h-[260px] flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-abiric-forestSoft/30 text-lg text-emerald-300">
              ✓
            </div>

            <p className="mt-4 text-sm font-semibold text-abiric-cream">
              Nothing urgent
            </p>

            <p className="mt-2 max-w-xs text-xs leading-5 text-abiric-muted">
              Bid deadlines and contract milestones will surface here automatically.
            </p>
          </div>
        </div>
      </section>

      {/* FINANCIAL + QUICK ACTIONS */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">

        {/* FINANCIAL SNAPSHOT */}
        <div className="abiric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="abiric-label">Financial Position</p>
              <h2 className="mt-1 text-lg font-semibold text-abiric-cream">
                Contract Performance
              </h2>
            </div>

            <Link
              href="/dashboard/ledger"
              className="text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight"
            >
              Open ledger →
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.07] bg-abiric-charcoal p-4">
              <p className="text-xs text-abiric-muted">Revenue</p>
              <p className="mt-2 text-xl font-bold text-abiric-cream">$0</p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-abiric-charcoal p-4">
              <p className="text-xs text-abiric-muted">Direct Costs</p>
              <p className="mt-2 text-xl font-bold text-abiric-cream">$0</p>
            </div>

            <div className="rounded-xl border border-abiric-salmon/15 bg-abiric-salmon/[0.05] p-4">
              <p className="text-xs text-abiric-muted">Gross Margin</p>
              <p className="mt-2 text-xl font-bold text-abiric-salmon">$0</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-white/10 p-5">
            <p className="text-xs leading-5 text-abiric-muted">
              Financial performance will populate from contract-level ledger transactions rather than manual dashboard entries.
            </p>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="abiric-card">
          <p className="abiric-label">Workspace</p>
          <h2 className="mt-1 text-lg font-semibold text-abiric-cream">
            Quick Actions
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-white/[0.07] bg-abiric-charcoal p-4 transition hover:border-abiric-salmon/30 hover:bg-abiric-surfaceLight"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-abiric-salmon/10 text-sm font-bold text-abiric-salmon transition group-hover:bg-abiric-salmon group-hover:text-abiric-black">
                  {action.icon}
                </div>

                <h3 className="mt-3 text-sm font-semibold text-abiric-cream">
                  {action.title}
                </h3>

                <p className="mt-1 text-[11px] leading-4 text-abiric-muted">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER STATUS */}
      <footer className="flex flex-col gap-2 border-t border-white/[0.06] pt-5 text-[10px] uppercase tracking-[0.14em] text-white/25 sm:flex-row sm:items-center sm:justify-between">
        <span>ABIRIC INC. • Operations Platform</span>
        <span>Procurement • Delivery • Finance</span>
      </footer>

    </div>
  );
}