"use client";

import { useState } from "react";
import Link from "next/link";

function firstValue(contract, keys) {
  for (const key of keys) {
    const value = contract?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function tenderDetails(contract) {
  return {
    title:
      firstValue(contract, ["Title", "title"]) ||
      "Untitled tender",

    reference: firstValue(contract, [
      "Reference number",
      "Reference Number",
      "referenceNumber",
    ]),

    region: firstValue(contract, [
      "Region",
      "region",
    ]),

    category: firstValue(contract, [
      "Category",
      "category",
    ]),

    organization: firstValue(contract, [
      "Organization name",
      "Organization Name",
      "Organization",
      "Department",
      "department",
    ]),

    closingDate: firstValue(contract, [
      "Closing date",
      "Closing Date",
      "closingDate",
    ]),
  };
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState(null);
  const [tracked, setTracked] = useState({});

  async function search() {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      setError("Enter a keyword, category, department or region.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const res = await fetch(
        `/api/contracts?q=${encodeURIComponent(cleanQuery)}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to search CanadaBuys.");
      }

      setContracts(data.contracts || []);
    } catch (err) {
      setContracts([]);
      setError(err.message || "Unable to search CanadaBuys.");
    } finally {
      setLoading(false);
    }
  }

  async function track(contract, index) {
    setTracking(index);
    setError("");

    try {
      const res = await fetch("/api/contracts/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contract }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to track opportunity.");
      }

      setTracked((current) => ({
        ...current,
        [index]: data.tracked?.bid_id || true,
      }));
    } catch (err) {
      setError(err.message || "Unable to track opportunity.");
    } finally {
      setTracking(null);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      search();
    }
  }

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-abiric-salmon" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-abiric-salmon">
              Procurement Intelligence
            </p>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-abiric-cream">
            Discover Opportunities
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-abiric-muted">
            Search live CanadaBuys tender notices and move qualified
            opportunities directly into the ABIRIC pipeline.
          </p>
        </div>

        <Link
          href="/dashboard/pipeline"
          className="abiric-button-secondary"
        >
          View Pipeline →
        </Link>
      </section>

      {/* SEARCH */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-abiric-surface">
        <div className="border-b border-white/[0.07] bg-abiric-forestDark/35 px-5 py-4">
          <p className="abiric-label">CanadaBuys</p>
          <h2 className="mt-1 text-base font-semibold text-abiric-cream">
            Tender Search
          </h2>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-abiric-muted">
                ⌕
              </span>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Try: office furniture, IT services, Ontario..."
                className="abiric-input pl-11"
              />
            </div>

            <button
              onClick={search}
              disabled={loading}
              className="abiric-button min-w-[120px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-abiric-muted">
              Search across the live federal tender feed.
            </p>

            {searched && !loading && !error && (
              <p className="text-[11px] font-semibold text-abiric-salmon">
                {contracts.length} result
                {contracts.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* INITIAL STATE */}
      {!searched && !loading && (
        <section className="rounded-2xl border border-dashed border-white/10 bg-abiric-surface/40 px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-abiric-salmon/20 bg-abiric-salmon/10 text-2xl text-abiric-salmon">
            ⌕
          </div>

          <h2 className="mt-5 text-base font-semibold text-abiric-cream">
            Search the procurement market
          </h2>

          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-abiric-muted">
            Find opportunities by product, service, category, government
            organization or region. Results come from CanadaBuys.
          </p>
        </section>
      )}

      {/* LOADING */}
      {loading && (
        <section className="grid gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-2xl border border-white/[0.06] bg-abiric-surface"
            />
          ))}
        </section>
      )}

      {/* NO RESULTS */}
      {searched &&
        !loading &&
        !error &&
        contracts.length === 0 && (
          <section className="rounded-2xl border border-dashed border-white/10 bg-abiric-surface/40 px-6 py-14 text-center">
            <p className="text-sm font-semibold text-abiric-cream">
              No matching tenders found
            </p>

            <p className="mt-2 text-xs text-abiric-muted">
              Try a broader keyword or a different product, service or region.
            </p>
          </section>
        )}

      {/* RESULTS */}
      {!loading && contracts.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="abiric-label">Search Results</p>
              <h2 className="mt-1 text-lg font-semibold text-abiric-cream">
                Live Opportunities
              </h2>
            </div>

            <span className="rounded-full border border-abiric-salmon/20 bg-abiric-salmon/[0.07] px-3 py-1 text-[11px] font-semibold text-abiric-salmon">
              {contracts.length} found
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {contracts.map((contract, index) => {
              const details = tenderDetails(contract);
              const isTracked = Boolean(tracked[index]);
              const isTracking = tracking === index;

              return (
                <article
                  key={`${details.reference}-${index}`}
                  className="group flex flex-col rounded-2xl border border-white/[0.08] bg-abiric-surface p-5 transition hover:border-abiric-salmon/25"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {details.region && (
                          <span className="rounded-full bg-abiric-forestSoft/35 px-2.5 py-1 text-[10px] font-medium text-emerald-200">
                            {details.region}
                          </span>
                        )}

                        {details.category && (
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-abiric-muted">
                            {details.category}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold leading-6 text-abiric-cream">
                        {details.title}
                      </h3>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-abiric-salmon/10 text-abiric-salmon">
                      ↗
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 border-y border-white/[0.06] py-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                        Reference
                      </p>
                      <p className="mt-1 truncate text-xs text-abiric-cream">
                        {details.reference || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                        Organization
                      </p>
                      <p className="mt-1 truncate text-xs text-abiric-cream">
                        {details.organization || "Government of Canada"}
                      </p>
                    </div>

                    {details.closingDate && (
                      <div className="sm:col-span-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                          Closing
                        </p>
                        <p className="mt-1 text-xs font-medium text-abiric-salmon">
                          {details.closingDate}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <p className="text-[10px] text-abiric-muted">
                      CanadaBuys tender notice
                    </p>

                    {isTracked ? (
                      <Link
                        href="/dashboard/pipeline"
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-xs font-semibold text-emerald-300"
                      >
                        ✓ In Pipeline
                      </Link>
                    ) : (
                      <button
                        onClick={() => track(contract, index)}
                        disabled={isTracking}
                        className="rounded-xl bg-abiric-salmon px-3 py-2 text-xs font-bold text-abiric-black transition hover:bg-abiric-salmonLight disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isTracking ? "Adding..." : "+ Track Opportunity"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}