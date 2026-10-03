import { isMissingColumnError, isMissingTableError } from "../lib/schema-guard.js";

let pass = 0, fail = 0;
function check(label, actual, expected) {
  if (actual === expected) { console.log(`PASS: ${label}`); pass++; }
  else { console.error(`FAIL: ${label} — expected ${expected}, got ${actual}`); fail++; }
}

// Realistic Supabase/PostgREST error shapes for these two cases.
const missingColumn = { code: "42703", message: 'column "awarded_value" of relation "contracts" does not exist' };
const missingTable = { code: "42P01", message: 'relation "company_settings" does not exist' };
const unrelatedError = { code: "23505", message: "duplicate key value violates unique constraint" };
const messageOnlyColumn = { message: 'column "gst_hst_amount" does not exist' };

check("detects missing column by code", isMissingColumnError(missingColumn), true);
check("detects missing column by message when code absent", isMissingColumnError(messageOnlyColumn), true);
check("does not flag missing table as missing column", isMissingColumnError(missingTable), false);
check("does not flag unrelated error as missing column", isMissingColumnError(unrelatedError), false);

check("detects missing table by code", isMissingTableError(missingTable), true);
check("does not flag missing column as missing table", isMissingTableError(missingColumn), false);
check("does not flag unrelated error as missing table", isMissingTableError(unrelatedError), false);
check("handles null error safely", isMissingColumnError(null), false);

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) process.exitCode = 1;
