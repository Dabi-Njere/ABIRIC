// Lets new routes survive being deployed before their migration has run,
// rather than hard-failing the whole request. Used only to retry an
// insert/select without the not-yet-existent fields/table — never to
// silently drop a real validation or business-logic error.

export function isMissingColumnError(error) {
  if (error?.code === "42703") return true;
  // Real Postgres missing-column messages: 'column "x" does not exist' or
  // 'column "x" of relation "y" does not exist' — always starts with "column".
  return /^column .* does not exist/i.test(error?.message || "");
}

export function isMissingTableError(error) {
  if (error?.code === "42P01") return true;
  // Real Postgres missing-table messages always start with "relation" —
  // anchored so it can't also match a missing-column message that merely
  // mentions "of relation ... does not exist" partway through.
  return /^relation .* does not exist/i.test(error?.message || "");
}
