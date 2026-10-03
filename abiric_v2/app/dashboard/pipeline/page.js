"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STAGES = ["New", "Reviewing", "Bidding", "Submitted", "Won", "Passed"];

const STAGE_META = {
  New: {
    label: "New",
    description: "Recently tracked",
  },
  Reviewing: {
    label: "Reviewing",
    description: "Qualification",
  },
  Bidding: {
    label: "Bidding",
    description: "Response in progress",
  },
  Submitted: {
    label: "Submitted",
    description: "Awaiting decision",
  },
  Won: {
    label: "Won",
    description: "Awarded",
  },
  Passed: {
    label: "Passed",
    description: "Not pursuing",
  },
};

function firstValue(object, keys) {
  for (const key of keys) {
    const value = object?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function getTenderMeta(contract) {
  const raw = contract?.raw_data || {};

  // Dedicated columns are the source of truth — they exist precisely so a
  // manually entered opportunity doesn't have to round-trip through raw_data
  // key-guessing. raw_data (from an eventual CSV import) is only a fallback.
  return {
    organization:
      contract?.organization ||
      firstValue(raw, [
        "Organization name",
        "Organization Name",
        "Organization",
        "Department",
        "department",
      ]),

    region:
      contract?.region ||
      firstValue(raw, ["Region", "region"]),

    category:
      contract?.category ||
      firstValue(raw, ["Category", "category"]),

    closingDate:
      contract?.closing_date ||
      firstValue(raw, ["Closing date", "Closing Date", "closingDate"]),

    estimatedValue:
      contract?.estimated_value !== null && contract?.estimated_value !== undefined
        ? Number(contract.estimated_value)
        : null,

    tenderUrl: contract?.tender_url || firstValue(raw, ["Tender URL", "url"]),
  };
}

export default function PipelinePage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
const [creating, setCreating] = useState(false);
const [manualForm, setManualForm] = useState({
  title: "",
  reference_number: "",
  organization: "",
  category: "",
  region: "",
  closing_date: "",
  estimated_value: "",
  tender_url: "",
  notes: "",
});

async function createOpportunity(e) {
  e.preventDefault();
  setCreating(true);
  setError("");

  try {
    const res = await fetch("/api/contracts/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manualForm),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Unable to create opportunity.");
    }

    setContracts((current) => [data.tracked, ...current]);

    setManualForm({
      title: "",
      reference_number: "",
      organization: "",
      category: "",
      region: "",
      closing_date: "",
      estimated_value: "",
      tender_url: "",
      notes: "",
    });

    setManualOpen(false);
  } catch (err) {
    setError(err.message || "Unable to create opportunity.");
  } finally {
    setCreating(false);
  }
}

  async function loadPipeline() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contracts/track", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to load pipeline.");
      }

      let opportunities = data.contracts || [];

      // Resolve "View Contract" links for opportunities already Won from a
      // previous session — contracts.tracked_contract_id is the source of
      // truth; contract_number vs. reference_number/bid_id is the fallback
      // for contracts created before that column existed.
      const wonIds = opportunities.filter((o) => o.stage === "Won");
      if (wonIds.length > 0) {
        try {
          const ledgerRes = await fetch("/api/ledger/contracts", { cache: "no-store" });
          const ledgerData = await ledgerRes.json();
          const allContracts = ledgerData.contracts || [];

          const byTrackedId = new Map(
            allContracts.filter((c) => c.tracked_contract_id).map((c) => [c.tracked_contract_id, c.id])
          );
          const byContractNumber = new Map(allContracts.map((c) => [c.contract_number, c.id]));

          opportunities = opportunities.map((o) => {
            if (o.stage !== "Won") return o;
            const matchId =
              byTrackedId.get(o.id) ||
              byContractNumber.get(o.reference_number) ||
              byContractNumber.get(o.bid_id) ||
              null;
            return matchId ? { ...o, operational_contract_id: matchId } : o;
          });
        } catch {
          // Non-fatal — the pipeline still works without the resolved link.
        }
      }

      setContracts(opportunities);
    } catch (err) {
      setError(err.message || "Unable to load pipeline.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPipeline();
  }, []);

  async function changeStage(contract, stage) {
    if (!contract?.id || stage === contract.stage) return;

    setUpdatingId(contract.id);
    setError("");

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to update opportunity.");
      }

      setContracts((current) =>
        current.map((item) =>
          item.id === contract.id
            ? {
                ...item,
                ...data.contract,
                operational_contract_id:
                  data.operational_contract?.id || item.operational_contract_id,
              }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Unable to update opportunity.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveNotes(contract, notes) {
    if (!contract?.id) return;

    setUpdatingId(contract.id);
    setError("");

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to save notes.");
      }

      setContracts((current) =>
        current.map((item) =>
          item.id === contract.id
            ? { ...item, ...data.contract }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Unable to save notes.");
    } finally {
      setUpdatingId(null);
    }
  }

  const stageCounts = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage] = contracts.filter(
        (contract) => contract.stage === stage
      ).length;

      return acc;
    }, {});
  }, [contracts]);

  const activeCount = contracts.filter(
    (contract) =>
      !["Won", "Passed"].includes(contract.stage)
  ).length;

  const submittedCount = stageCounts.Submitted || 0;
  const wonCount = stageCounts.Won || 0;

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const visibleContracts = useMemo(() => {
    let list = contracts;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((c) => {
        const meta = getTenderMeta(c);
        return (
          c.title?.toLowerCase().includes(q) ||
          c.reference_number?.toLowerCase().includes(q) ||
          meta.organization?.toLowerCase().includes(q)
        );
      });
    }

    if (sortBy === "value") {
      list = [...list].sort(
        (a, b) => (Number(b.estimated_value) || 0) - (Number(a.estimated_value) || 0)
      );
    } else if (sortBy === "deadline") {
      list = [...list].sort((a, b) => {
        const da = a.closing_date ? new Date(a.closing_date).getTime() : Infinity;
        const db = b.closing_date ? new Date(b.closing_date).getTime() : Infinity;
        return da - db;
      });
    }

    return list;
  }, [contracts, searchTerm, sortBy]);

  return (
    <div className="space-y-7">

      {/* HEADER */}
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-abiric-salmon" />

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-abiric-salmon">
              Procurement Operations
            </p>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-abiric-cream">
            Bid Pipeline
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-abiric-muted">
            Move qualified opportunities from initial review through bidding,
            submission and award.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
  <button
    type="button"
    onClick={() => setManualOpen(true)}
    className="abiric-button"
  >
    + Add Opportunity
  </button>

</div>
      </section>

      {/* SEARCH / SORT */}
      {contracts.length > 0 && (
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search title, reference or client..."
            className="w-full rounded-xl border border-white/10 bg-abiric-charcoal px-3 py-2 text-xs text-abiric-cream outline-none focus:border-abiric-salmon sm:max-w-xs"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-white/10 bg-abiric-charcoal px-3 py-2 text-xs text-abiric-cream outline-none focus:border-abiric-salmon"
          >
            <option value="recent">Sort: Most recent</option>
            <option value="deadline">Sort: Closing date</option>
            <option value="value">Sort: Estimated value</option>
          </select>
        </section>
      )}
{manualOpen && (
  <section className="rounded-2xl border border-abiric-salmon/20 bg-abiric-surface p-5">
    <div className="mb-5 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-abiric-cream">
          Add Opportunity
        </h2>
        <p className="mt-1 text-xs text-abiric-muted">
          Add a tender or business opportunity to the ABIRIC pipeline.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setManualOpen(false)}
        className="text-sm text-abiric-muted hover:text-abiric-cream"
      >
        Close
      </button>
    </div>

    <form
      onSubmit={createOpportunity}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <input
        required
        placeholder="Opportunity title *"
        value={manualForm.title}
        onChange={(e) =>
          setManualForm({ ...manualForm, title: e.target.value })
        }
        className="abiric-input"
      />

      <input
        placeholder="Reference / solicitation number"
        value={manualForm.reference_number}
        onChange={(e) =>
          setManualForm({
            ...manualForm,
            reference_number: e.target.value,
          })
        }
        className="abiric-input"
      />

      <input
        placeholder="Government department / client"
        value={manualForm.organization}
        onChange={(e) =>
          setManualForm({
            ...manualForm,
            organization: e.target.value,
          })
        }
        className="abiric-input"
      />

      <input
        placeholder="Category"
        value={manualForm.category}
        onChange={(e) =>
          setManualForm({ ...manualForm, category: e.target.value })
        }
        className="abiric-input"
      />

      <input
        placeholder="Region"
        value={manualForm.region}
        onChange={(e) =>
          setManualForm({ ...manualForm, region: e.target.value })
        }
        className="abiric-input"
      />

      <input
        type="date"
        value={manualForm.closing_date}
        onChange={(e) =>
          setManualForm({
            ...manualForm,
            closing_date: e.target.value,
          })
        }
        className="abiric-input"
      />

      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Estimated value"
        value={manualForm.estimated_value}
        onChange={(e) =>
          setManualForm({
            ...manualForm,
            estimated_value: e.target.value,
          })
        }
        className="abiric-input"
      />

      <input
        type="url"
        placeholder="Tender URL"
        value={manualForm.tender_url}
        onChange={(e) =>
          setManualForm({
            ...manualForm,
            tender_url: e.target.value,
          })
        }
        className="abiric-input"
      />

      <textarea
        placeholder="Notes"
        rows={3}
        value={manualForm.notes}
        onChange={(e) =>
          setManualForm({ ...manualForm, notes: e.target.value })
        }
        className="abiric-input md:col-span-2 xl:col-span-3"
      />

      <div className="flex gap-3 md:col-span-2 xl:col-span-3">
        <button
          type="submit"
          disabled={creating}
          className="abiric-button disabled:opacity-50"
        >
          {creating ? "Adding..." : "Add to Pipeline"}
        </button>

        <button
          type="button"
          onClick={() => setManualOpen(false)}
          className="abiric-button-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  </section>
)}

      {/* SUMMARY */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tracked"
          value={contracts.length}
          detail="Total opportunities"
        />

        <SummaryCard
          label="Active"
          value={activeCount}
          detail="Still in motion"
        />

        <SummaryCard
          label="Submitted"
          value={submittedCount}
          detail="Awaiting decisions"
        />

        <SummaryCard
          label="Won"
          value={wonCount}
          detail="Awarded contracts"
          salmon
        />
      </section>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <section className="grid gap-4 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-2xl border border-white/[0.06] bg-abiric-surface"
            />
          ))}
        </section>
      )}

      {/* EMPTY PIPELINE */}
      {!loading && contracts.length === 0 && (
        <section className="rounded-2xl border border-dashed border-white/10 bg-abiric-surface/50 px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-abiric-salmon/20 bg-abiric-salmon/10 text-xl text-abiric-salmon">
            ◇
          </div>

          <h2 className="mt-5 text-base font-semibold text-abiric-cream">
            Your pipeline is empty
          </h2>

          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-abiric-muted">
            Add an opportunity manually to start tracking it through
            qualification, bidding, and award.
          </p>

          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="abiric-button mt-5"
          >
            + Add Opportunity
          </button>
        </section>
      )}

      {/* BOARD */}
      {!loading && contracts.length > 0 && (
        <section className="overflow-x-auto pb-4">
          <div className="grid min-w-[1500px] grid-cols-6 gap-4">
            {STAGES.map((stage) => {
              const stageContracts = visibleContracts.filter(
                (contract) => contract.stage === stage
              );

              return (
                <div
                  key={stage}
                  className="rounded-2xl border border-white/[0.07] bg-abiric-charcoal/50 p-3"
                >
                  {/* COLUMN HEADER */}
                  <div className="mb-3 flex items-start justify-between px-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            stage === "Won"
                              ? "bg-emerald-400"
                              : stage === "Passed"
                              ? "bg-white/25"
                              : stage === "Submitted"
                              ? "bg-abiric-salmon"
                              : "bg-abiric-forestSoft"
                          }`}
                        />

                        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-abiric-cream">
                          {STAGE_META[stage].label}
                        </h2>
                      </div>

                      <p className="mt-1 pl-4 text-[10px] text-abiric-muted">
                        {STAGE_META[stage].description}
                      </p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-semibold text-abiric-muted">
                      {stageContracts.length}
                    </span>
                  </div>

                  {/* CARDS */}
                  <div className="space-y-3">
                    {stageContracts.map((contract) => (
                      <OpportunityCard
                        key={contract.id}
                        contract={contract}
                        updating={updatingId === contract.id}
                        onStageChange={changeStage}
                        onSaveNotes={saveNotes}
                      />
                    ))}

                    {stageContracts.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/[0.07] px-3 py-8 text-center">
                        <p className="text-[10px] text-white/25">
                          No opportunities
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  salmon = false,
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-abiric-surface p-4">
      <div
        className={`absolute left-0 top-0 h-full w-1 ${
          salmon
            ? "bg-abiric-salmon"
            : "bg-abiric-forestSoft"
        }`}
      />

      <p className="abiric-label">
        {label}
      </p>

      <p
        className={`mt-3 text-2xl font-bold ${
          salmon
            ? "text-abiric-salmon"
            : "text-abiric-cream"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[10px] text-abiric-muted">
        {detail}
      </p>
    </div>
  );
}

function OpportunityCard({
  contract,
  updating,
  onStageChange,
  onSaveNotes,
}) {
  const meta = getTenderMeta(contract);
  const [notes, setNotes] = useState(contract.notes || "");
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    setNotes(contract.notes || "");
  }, [contract.notes]);

  async function submitNotes() {
    await onSaveNotes(contract, notes);
    setNotesOpen(false);
  }

  return (
    <article className="rounded-xl border border-white/[0.08] bg-abiric-surface p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md bg-abiric-salmon/10 px-2 py-1 text-[9px] font-bold tracking-wider text-abiric-salmon">
          {contract.bid_id || "BID"}
        </span>

        {updating && (
          <span className="text-[9px] text-abiric-muted">
            Saving...
          </span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-3 text-sm font-semibold leading-5 text-abiric-cream">
        {contract.title}
      </h3>

      {contract.reference_number && (
        <p className="mt-2 text-[10px] text-abiric-muted">
          Ref: {contract.reference_number}
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {meta.organization && (
          <MetaRow
            label="Client"
            value={meta.organization}
          />
        )}

        {meta.region && (
          <MetaRow
            label="Region"
            value={meta.region}
          />
        )}

        {meta.closingDate && (
          <MetaRow
            label="Closing"
            value={meta.closingDate}
            salmon
          />
        )}

        {meta.estimatedValue !== null && (
          <MetaRow
            label="Est. value"
            value={meta.estimatedValue.toLocaleString("en-CA", {
              style: "currency",
              currency: "CAD",
              maximumFractionDigits: 0,
            })}
          />
        )}
      </div>

      {meta.tenderUrl && (
        <a
          href={meta.tenderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block truncate text-[10px] font-semibold text-abiric-salmon hover:text-abiric-salmonLight"
        >
          View tender ↗
        </a>
      )}

      {contract.stage === "Won" && contract.operational_contract_id && (
        <Link
          href={`/dashboard/ledger/${contract.operational_contract_id}`}
          className="mt-3 block rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-center text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/[0.12]"
        >
          View Contract →
        </Link>
      )}

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30">
          Stage
        </label>

        <select
          value={contract.stage}
          disabled={updating}
          onChange={(event) =>
            onStageChange(contract, event.target.value)
          }
          className="w-full rounded-lg border border-white/10 bg-abiric-charcoal px-2.5 py-2 text-[11px] text-abiric-cream outline-none transition focus:border-abiric-salmon"
        >
          {STAGES.map((stage) => (
            <option
              key={stage}
              value={stage}
            >
              {stage}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        {!notesOpen ? (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="text-[10px] font-semibold text-abiric-salmon hover:text-abiric-salmonLight"
          >
            {contract.notes
              ? "Edit notes"
              : "+ Add notes"}
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Qualification notes, pricing considerations..."
              className="w-full resize-none rounded-lg border border-white/10 bg-abiric-charcoal px-2.5 py-2 text-[11px] text-abiric-cream outline-none focus:border-abiric-salmon"
            />

            <div className="flex gap-2">
              <button
                type="button"
                disabled={updating}
                onClick={submitNotes}
                className="rounded-lg bg-abiric-salmon px-2.5 py-1.5 text-[10px] font-bold text-abiric-black disabled:opacity-50"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotes(contract.notes || "");
                  setNotesOpen(false);
                }}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-abiric-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {contract.notes && !notesOpen && (
        <p className="mt-3 line-clamp-3 rounded-lg bg-black/15 p-2 text-[10px] leading-4 text-abiric-muted">
          {contract.notes}
        </p>
      )}
    </article>
  );
}

function MetaRow({
  label,
  value,
  salmon = false,
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-[10px]">
      <span className="shrink-0 text-white/30">
        {label}
      </span>

      <span
        className={`text-right ${
          salmon
            ? "font-medium text-abiric-salmon"
            : "text-abiric-muted"
        }`}
      >
        {value}
      </span>
    </div>
  );
}