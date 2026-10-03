import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOverviewData } from "@/lib/dashboard";

// This page reads live ledger/pipeline data on every request — it must
// never be statically prerendered at build time (that would bake in
// one-time data and never update).
export const dynamic = "force-dynamic";

const money = (n) =>
  Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

const QUICK_ACTIONS = [
  {
    href: "/dashboard/opportunities",
    title: "Opportunities",
    description: "Search, add, or import opportunities.",
    icon: "☰",
  },
  {
    href: "/dashboard/pipeline",
    title: "Review Pipeline",
    description: "Track opportunities from qualification through award.",
    icon: "◇",
  },
  {
    href: "/dashboard/ledger",
    title: "Open Contracts",
    description: "Manage contract revenue, costs and fulfillment.",
    icon: "▤",
  },
  {
    href: "/dashboard/accounting",
    title: "Accounting",
    description: "Review financial performance and receivables.",
    icon: "$",
  },
];

export default async function DashboardHome() {
  const db = supabaseAdmin();
  const data = await getOverviewData(db);

  const kpiCards = [
    { label: "Pipeline Value", value: money(data.kpis.pipelineValue), detail: "Open opportunities, estimated", accent: "salmon" },
    { label: "Active Bids", value: String(data.kpis.activeBids), detail: "In bidding or submitted", accent: "salmon" },
    { label: "Contracts Won", value: String(data.kpis.contractsWon), detail: `Awarded value: ${money(data.kpis.totalAwardedValue)}`, accent: "green" },
    { label: "Receivables", value: money(data.kpis.outstandingReceivables), detail: "Invoiced, not yet collected", accent: "salmon" },
  ];

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-abiric-salmon" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-abiric-salmon">Command Centre</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-abiric-cream lg:text-4xl">Overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-abiric-muted">
            Your procurement, contract delivery and financial operations in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/ledger" className="abiric-button-secondary">View Contracts</Link>
          <Link href="/dashboard/opportunities" className="abiric-button">+ Opportunity</Link>
        </div>
      </section>

      {/* KPI GRID */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-abiric-surface p-5 transition hover:-translate-y-0.5 hover:border-abiric-salmon/25">
            <div className={`absolute left-0 top-0 h-full w-1 ${card.accent === "salmon" ? "bg-abiric-salmon" : "bg-abiric-forestSoft"}`} />
            <div className="flex items-start justify-between">
              <p className="abiric-label">{card.label}</p>
              <span className={`h-2 w-2 rounded-full ${card.accent === "salmon" ? "bg-abiric-salmon" : "bg-emerald-400"}`} />
            </div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-abiric-cream">{card.value}</p>
            <p className="mt-2 text-xs text-abiric-muted">{card.detail}</p>
          </div>
        ))}
      </section>

      {/* MAIN OPERATING AREA */}
      <section className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* PIPELINE */}
        <div className="abiric-card">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
            <div>
              <p className="abiric-label">Procurement</p>
              <h2 className="mt-1 text-lg font-semibold text-abiric-cream">Active Pipeline</h2>
            </div>
            <Link href="/dashboard/pipeline" className="text-xs font-semibold text-abiric-salmon transition hover:text-abiric-salmonLight">
              View pipeline →
            </Link>
          </div>

          {data.activePipeline.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-5 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-abiric-salmon/20 bg-abiric-salmon/10 text-xl text-abiric-salmon">◇</div>
              <h3 className="mt-4 text-sm font-semibold text-abiric-cream">No active opportunities yet</h3>
              <p className="mt-2 max-w-sm text-xs leading-5 text-abiric-muted">
                Qualified opportunities and active bids will appear here as you build the pipeline.
              </p>
              <Link href="/dashboard/pipeline" className="mt-5 text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight">
                Add an opportunity →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {data.activePipeline.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-abiric-cream">{o.title}</p>
                    <p className="mt-0.5 text-[11px] text-abiric-muted">
                      {o.client || "No client on file"} · {o.stage}
                      {o.closingDate ? ` · closes ${o.closingDate}` : ""}
                    </p>
                  </div>
                  {o.estimatedValue !== null && (
                    <span className="shrink-0 text-sm font-semibold text-abiric-cream">{money(o.estimatedValue)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DEADLINES */}
        <div className="abiric-card">
          <div className="border-b border-white/[0.07] pb-4">
            <p className="abiric-label">Attention</p>
            <h2 className="mt-1 text-lg font-semibold text-abiric-cream">Upcoming Deadlines</h2>
          </div>

          {data.upcomingDeadlines.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-abiric-forestSoft/30 text-lg text-emerald-300">✓</div>
              <p className="mt-4 text-sm font-semibold text-abiric-cream">Nothing urgent</p>
              <p className="mt-2 max-w-xs text-xs leading-5 text-abiric-muted">
                Bid deadlines and unpaid invoice due dates within 30 days will surface here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 py-2">
              {data.upcomingDeadlines.map((d, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-abiric-charcoal px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-abiric-cream">{d.label}</p>
                    <p className="text-[10px] uppercase tracking-wide text-abiric-muted">
                      {d.type === "opportunity" ? "Bid closing" : "Invoice due"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-abiric-salmon">{d.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* FINANCIAL + QUICK ACTIONS */}
      <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="abiric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="abiric-label">Financial Position</p>
              <h2 className="mt-1 text-lg font-semibold text-abiric-cream">Contract Performance</h2>
            </div>
            <Link href="/dashboard/accounting" className="text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight">
              Open accounting →
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.07] bg-abiric-charcoal p-4">
              <p className="text-xs text-abiric-muted">Revenue (invoiced)</p>
              <p className="mt-2 text-xl font-bold text-abiric-cream">{money(data.performance.invoicedTotal)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-abiric-charcoal p-4">
              <p className="text-xs text-abiric-muted">Direct Costs</p>
              <p className="mt-2 text-xl font-bold text-abiric-cream">{money(data.performance.directCosts)}</p>
            </div>
            <div className="rounded-xl border border-abiric-salmon/15 bg-abiric-salmon/[0.05] p-4">
              <p className="text-xs text-abiric-muted">Gross Margin</p>
              <p className="mt-2 text-xl font-bold text-abiric-salmon">
                {money(data.performance.grossMargin)}
                {data.performance.grossMarginPercent !== null && (
                  <span className="ml-1 text-xs font-medium text-abiric-muted">
                    ({data.performance.grossMarginPercent.toFixed(1)}%)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-white/10 p-5">
            <p className="text-xs leading-5 text-abiric-muted">
              Revenue is invoiced (accrual), not cash collected — see Receivables for what's actually
              been paid. Direct costs are purchase lots + direct expenses + financing, summed directly
              with no overhead allocation.
            </p>
          </div>
        </div>

        <div className="abiric-card">
          <p className="abiric-label">Workspace</p>
          <h2 className="mt-1 text-lg font-semibold text-abiric-cream">Quick Actions</h2>
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
                <h3 className="mt-3 text-sm font-semibold text-abiric-cream">{action.title}</h3>
                <p className="mt-1 text-[11px] leading-4 text-abiric-muted">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-white/[0.06] pt-5 text-[10px] uppercase tracking-[0.14em] text-white/25 sm:flex-row sm:items-center sm:justify-between">
        <span>ABIRIC INC. • Operations Platform</span>
        <span>Procurement • Delivery • Finance</span>
      </footer>
    </div>
  );
}
