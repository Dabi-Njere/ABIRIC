import { monthBounds } from "../lib/monthly-statement.js";

let pass = 0, fail = 0;
function check(label, actual, expected) {
  if (actual === expected) { console.log(`PASS: ${label}`); pass++; }
  else { console.error(`FAIL: ${label} — expected ${expected}, got ${actual}`); fail++; }
}

const feb2028 = monthBounds("2028-02"); // leap year
check("leap year Feb start", feb2028.start, "2028-02-01");
check("leap year Feb end (29 days)", feb2028.end, "2028-02-29");

const feb2026 = monthBounds("2026-02"); // non-leap year
check("non-leap Feb end (28 days)", feb2026.end, "2026-02-28");

const jan = monthBounds("2026-01");
check("31-day month end", jan.end, "2026-01-31");

const dec = monthBounds("2026-12");
check("December end (year boundary)", dec.end, "2026-12-31");

const nov = monthBounds("2026-11");
check("30-day month end", nov.end, "2026-11-30");

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) process.exitCode = 1;
