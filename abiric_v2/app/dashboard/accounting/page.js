export default function AccountingPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Project Accounting</h2>
      <p className="text-sm text-gray-400 mb-4">
        Backed by <code>/api/accounting/projects</code> and <code>/api/accounting/expenses</code>.
        Wire up forms here for revenue entry, expense logging (9 categories), and pull data into
        Recharts bar/line charts for revenue vs. expenses and monthly spend.
      </p>
      <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
        <li>Revenue per project</li>
        <li>Expense logging (Labour, Materials, Software, Travel, Subcontractors, Marketing, Office, Insurance, Other)</li>
        <li>CSV export</li>
        <li>GST/HST tax summary</li>
      </ul>
    </div>
  );
}
