import {
  getCycleDueDate, getCurrentCycle, getRecipientForCycle, calculatePot,
} from "./cycle.js";

let failed = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`}`);
};
const iso = (d) => d.toISOString().slice(0, 10);
const start = new Date("2026-01-01T00:00:00Z");

check("weekly cycle 1 = start", iso(getCycleDueDate(start, "weekly", 1)), "2026-01-01");
check("weekly cycle 3 = +14 days", iso(getCycleDueDate(start, "weekly", 3)), "2026-01-15");
check("bi-weekly cycle 3 = +28 days", iso(getCycleDueDate(start, "bi-weekly", 3)), "2026-01-29");
check("monthly cycle 2 = +1 month", iso(getCycleDueDate(start, "monthly", 2)), "2026-02-01");
const jan31 = new Date("2026-01-31T00:00:00Z");
check("monthly month-end clamp (31 Jan -> 28 Feb)", iso(getCycleDueDate(jan31, "monthly", 2)), "2026-02-28");
check("monthly no drift (31 Jan -> 31 Mar)", iso(getCycleDueDate(jan31, "monthly", 3)), "2026-03-31");
check("start date not mutated", iso(start), "2026-01-01");
check("current cycle on day 0 = 1", getCurrentCycle(start, "weekly", 5, new Date("2026-01-01T00:00:00Z")), 1);
check("current cycle on day 7 = 2", getCurrentCycle(start, "weekly", 5, new Date("2026-01-08T00:00:00Z")), 2);
check("current cycle on day 10 = 2", getCurrentCycle(start, "weekly", 5, new Date("2026-01-11T00:00:00Z")), 2);
check("5 members: day 28 still cycle 5", getCurrentCycle(start, "weekly", 5, new Date("2026-01-29T00:00:00Z")), 5);
check("5 members: finished after cycle 5", getCurrentCycle(start, "weekly", 5, new Date("2026-02-05T00:00:00Z")), 6);
check("future start = null", getCurrentCycle(new Date("2027-01-01"), "weekly", 5, new Date("2026-01-01")), null);
check("recipient of cycle 2", getRecipientForCycle([{ payoutPosition: 1, n: "a" }, { payoutPosition: 2, n: "b" }], 2).n, "b");
check("pot", calculatePot(10000, 5), 50000);

if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); }
console.log("\nAll cycle tests passed");