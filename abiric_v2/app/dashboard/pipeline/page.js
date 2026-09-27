export default function PipelinePage() {
  const stages = ["New", "Reviewing", "Bidding", "Submitted", "Won", "Passed"];
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Pipeline</h2>
      <div className="grid grid-cols-6 gap-3">
        {stages.map((s) => (
          <div key={s} className="bg-abiric-forestDark/40 border border-gray-800 rounded p-3 min-h-[200px]">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">{s}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Wire this board up to <code>tracked_contracts</code> (fetch via a server component or a
        client-side call to a new <code>GET /api/contracts/track</code> list route) and drag cards
        between stages, calling <code>PATCH /api/contracts/[id]</code> on drop.
      </p>
    </div>
  );
}
