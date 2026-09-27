export default function AdminPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Admin</h2>
      <p className="text-sm text-gray-400">
        User management, per-section permission toggles (Contracts / RFP Generator / Pipeline /
        Accounting / Admin), and the audit log (from the <code>audit_log</code> table) go here.
        Only accessible to users with <code>is_admin = true</code> — enforced in{" "}
        <code>middleware.js</code>.
      </p>
    </div>
  );
}
