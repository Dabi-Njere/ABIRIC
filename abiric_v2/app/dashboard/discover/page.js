import Link from "next/link";

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-abiric-charcoal text-xl text-abiric-muted">
        ⌕
      </div>
      <h1 className="mt-5 text-xl font-semibold text-abiric-cream">Live opportunity search isn't available</h1>
      <p className="mt-3 text-sm leading-6 text-abiric-muted">
        Find opportunities directly on CanadaBuys, SAP Ariba, or the relevant procurement portal,
        then bring them into ABIRIC manually or with a CSV import.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/dashboard/opportunities" className="abiric-button">Add Opportunity</Link>
        <Link href="/dashboard/opportunities/import" className="abiric-button-secondary">Import CSV</Link>
      </div>
    </div>
  );
}
