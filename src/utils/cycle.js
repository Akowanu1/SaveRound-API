// Pure functions: no database, easy to test.

// Month maths decision: always counted from the ORIGINAL start date and clamped to the
// last day of the target month. 31 Jan + 1 month = 28/29 Feb, and + 2 months = 31 Mar (no drift).
const addMonthsUTC = (date, months) => {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
};

export const getCycleDueDate = (startDate, frequency, cycleNumber) => {
  const n = cycleNumber - 1;
  if (frequency === "monthly") return addMonthsUTC(startDate, n);
  const days = frequency === "weekly" ? 7 : frequency === "bi-weekly" ? 14 : null;
  if (days === null) throw new Error(`Unknown frequency: ${frequency}`);
  const d = new Date(startDate);
  d.setUTCDate(d.getUTCDate() + n * days);
  return d;
};

// Returns null if not started, 1..totalCycles while running, totalCycles + 1 when finished.
export const getCurrentCycle = (startDate, frequency, totalCycles, now = new Date()) => {
  if (!startDate || new Date(now) < new Date(startDate)) return null;
  let cycle = 1;
  while (cycle <= totalCycles && getCycleDueDate(startDate, frequency, cycle + 1) <= now) {
    cycle++;
  }
  return cycle;
};

export const getRecipientForCycle = (approvedMembers, cycleNumber) =>
  approvedMembers.find((m) => m.payoutPosition === cycleNumber) || null;

export const calculatePot = (contributionAmount, memberCount) =>
  contributionAmount * memberCount;