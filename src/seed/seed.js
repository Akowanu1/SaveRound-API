// Seed script: fills the database with sample data so everyone can test quickly.
// Run with:  npm run seed
//
// SAFETY: this script deletes data. It refuses to run when NODE_ENV is "production".
import "dotenv/config"; // must be first so MONGO_URI and NODE_ENV are available
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import SavingsGroup from "../models/SavingsGroup.js";
import Membership from "../models/Membership.js";
import Contribution from "../models/Contribution.js";

// ---- Safety checks (before touching the database) ----
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run: the seed script must never run in production.");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not set in .env");
  process.exit(1);
}

const PASSWORD = "Password123"; // the same known password for every seed user
const SEED_EMAIL_REGEX = /@seed\.test$/; // seed users are recognised by this email ending
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);

// Deletes everything created by a previous seed run.
const clearOldSeedData = async () => {
  const oldUsers = await User.find({ email: SEED_EMAIL_REGEX }).select("_id");
  const userIds = oldUsers.map((u) => u._id);

  const oldGroups = await SavingsGroup.find({ creator: { $in: userIds } }).select("_id");
  const groupIds = oldGroups.map((g) => g._id);

  await Contribution.deleteMany({ $or: [{ group: { $in: groupIds } }, { user: { $in: userIds } }] });
  await Membership.deleteMany({ $or: [{ group: { $in: groupIds } }, { user: { $in: userIds } }] });
  await SavingsGroup.deleteMany({ _id: { $in: groupIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  console.log(`Cleared old seed data (${userIds.length} users, ${groupIds.length} groups).`);
};

// Builds approved memberships; payout positions follow the order of the members given.
const approvedMemberships = (group, members) =>
  members.map((user, i) => ({
    group: group._id,
    user: user._id,
    status: "approved",
    payoutPosition: i + 1,
    approvedAt: new Date(),
  }));

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  await clearOldSeedData();

  // ---- 8 verified users ----
  // insertMany skips the model's save hooks, so we hash the password ourselves.
  // This avoids hashing it twice if the User model also hashes in a pre-save hook.
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const names = [
    "Ada Okafor", "Bola Adeyemi", "Musa Ibrahim", "Ekaette Bassey",
    "Emeka Eze", "Fatima Bello", "Tamuno Briggs", "Hauwa Danjuma",
  ];
  const users = await User.insertMany(
    names.map((fullName, i) => ({
      fullName,
      email: `user${i + 1}@seed.test`,
      password: passwordHash,
      emailVerified: true,
    }))
  );

  // ---- 3 groups ----
  const [openGroup, readyGroup, activeGroup] = await SavingsGroup.insertMany([
    {
      // Open group with 2 members
      name: "Seed Open Group",
      description: "An open group with 2 members, still accepting requests.",
      creator: users[0]._id,
      contributionAmount: 5000,
      frequency: "weekly",
      maxMembers: 5,
      status: "open",
    },
    {
      // Open group with 4 approved members: the minimum, so the creator can start it
      name: "Seed Ready Group",
      description: "Has 4 approved members, ready to be started.",
      creator: users[2]._id,
      contributionAmount: 10000,
      frequency: "monthly",
      maxMembers: 6,
      status: "open",
    },
    {
      // Active group with 5 members that started 10 days ago
      name: "Seed Active Group",
      description: "An active weekly group, currently in cycle 2.",
      creator: users[0]._id,
      contributionAmount: 5000,
      frequency: "weekly",
      maxMembers: 5,
      status: "active",
      startDate: daysAgo(10),
    },
  ]);

  // ---- Memberships (the creator is always member 1) ----
  const activeMembers = [users[0], users[1], users[2], users[6], users[7]];
  await Membership.insertMany([
    ...approvedMemberships(openGroup, [users[0], users[1]]),
    ...approvedMemberships(readyGroup, [users[2], users[3], users[4], users[5]]),
    ...approvedMemberships(activeGroup, activeMembers),
  ]);

  // ---- Contributions for the active group ----
  // Weekly group started 10 days ago: cycle 1 is over, cycle 2 is running.
  const makeContribution = (user, cycleNumber, paidOn) => ({
    group: activeGroup._id,
    user: user._id,
    cycleNumber,
    amount: activeGroup.contributionAmount,
    paidOn,
  });
  const contributions = [
    // Cycle 1: every member paid
    ...activeMembers.map((u) => makeContribution(u, 1, daysAgo(9))),
    // Cycle 2: only the first 3 members have paid so far
    ...activeMembers.slice(0, 3).map((u) => makeContribution(u, 2, daysAgo(2))),
  ];
  await Contribution.insertMany(contributions);

  // ---- Summary ----
  console.log("\nSeed complete. Created:");
  console.log(`  ${users.length} users (all verified)`);
  console.log("  3 groups: open (2 members), ready to start (4 members), active (5 members)");
  console.log(`  ${contributions.length} contributions (5 for cycle 1, 3 for cycle 2)`);
  console.log(`\nLog in with any of: user1@seed.test ... user${users.length}@seed.test`);
  console.log(`Password for all: ${PASSWORD}`);
};

seed()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
