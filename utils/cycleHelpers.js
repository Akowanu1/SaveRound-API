const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Start date of a cycle. Cycle 1 begins on the group's startDate.
export const getCycleStart = (group, cycle) => {
  const start = new Date(group.startDate);

  if (group.frequency === "monthly") {
    const date = new Date(start);
    date.setUTCMonth(start.getUTCMonth() + cycle - 1);
    return date;
  }

  const days = group.frequency === "weekly" ? 7 : 14;
  return new Date(start.getTime() + (cycle - 1) * days * MS_PER_DAY);
};

// 0 means the first cycle has not begun. A group has at most maxMembers cycles, so the loop is short.
export const getCurrentCycle = (group, now = new Date()) => {
  if (now < new Date(group.startDate)) return 0;

  let cycle = 1;
  while (cycle <= group.maxMembers && getCycleStart(group, cycle + 1) <= now) {
    cycle += 1;
  }
  return cycle;
};

// R15: cycle n pays out to the member with payout position n
export const buildSchedule = (group, members) =>
  members.map((member) => ({
    cycle: member.payoutPosition,
    startDate: getCycleStart(group, member.payoutPosition),
    endDate: getCycleStart(group, member.payoutPosition + 1),
    recipient: member.user,
  }));