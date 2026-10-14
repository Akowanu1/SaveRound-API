import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import SavingsGroup from "../models/SavingsGroup.js";
import Membership from "../models/Membership.js";
import Contribution from "../models/Contribution.js";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV is production.");
  process.exit(1);
}

const DAY = 24 * 60 * 60 * 1000;

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // 1. Remove old sample data
  const old = await User.find({ email: /@seed\.test$/ }).select("_id");
  const oldIds = old.map((u) => u._id);
  const oldGroups = await SavingsGroup.find({ creator: { $in: oldIds } }).select("_id");
  const oldGroupIds = oldGroups.map((g) => g._id);
  await Contribution.deleteMany({ $or: [{ group: { $in: oldGroupIds } }, { user: { $in: oldIds } }] });
  await Membership.deleteMany({ $or: [{ group: { $in: oldGroupIds } }, { user: { $in: oldIds } }] });
  await SavingsGroup.deleteMany({ _id: { $in: oldGroupIds } });
  await User.deleteMany({ _id: { $in: oldIds } });

  // 2. Eight verified users, password "Password123" (hashed by the model hook)
  const users = await User.create(
    Array.from({ length: 8 }, (_, i) => ({
      fullName: `Seed User ${i + 1}`,
      email: `user${i + 1}@seed.test`,
      password: "Password123",
      emailVerified: true,
    }))
  );
  const u = (n) => users[n - 1]._id;

  const addMembers = (groupId, userNumbers) =>
    Membership.create(
      userNumbers.map((n, i) => ({
        group: groupId, user: u(n), status: "approved", payoutPosition: i + 1, approvedAt: new Date(),
      }))
    );

  // 3. Group 1: open, 2 members
  const g1 = await SavingsGroup.create({
    name: "Seed Open Small", creator: u(1), contributionAmount: 5000, frequency: "weekly", maxMembers: 5,
  });
  await addMembers(g1._id, [1, 2]);

  // Group 2: open, 4 approved, ready to start
  const g2 = await SavingsGroup.create({
    name: "Seed Ready To Start", creator: u(3), contributionAmount: 10000, frequency: "monthly", maxMembers: 6,
  });
  await addMembers(g2._id, [3, 4, 5, 6]);

  // Group 3: active, 5 members, started 10 days ago (weekly -> currently cycle 2)
  const g3 = await SavingsGroup.create({
    name: "Seed Active Group", creator: u(1), contributionAmount: 10000, frequency: "weekly",
    maxMembers: 5, status: "active", startDate: new Date(Date.now() - 10 * DAY),
  });
  await addMembers(g3._id, [1, 2, 3, 4, 5]);
  const contribs = [1, 2, 3, 4, 5].map((n) => ({ group: g3._id, user: u(n), cycleNumber: 1, amount: 10000 }));
  [1, 2, 3].forEach((n) => contribs.push({ group: g3._id, user: u(n), cycleNumber: 2, amount: 10000 }));
  await Contribution.create(contribs);

  console.log("Seed complete:");
  console.log("  8 users: user1@seed.test ... user8@seed.test (password: Password123)");
  console.log(`  Open group (2 members):        ${g1._id}`);
  console.log(`  Ready-to-start group (4):      ${g2._id}  (creator user3)`);
  console.log(`  Active group (5, cycle 2):     ${g3._id}  (creator user1)`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
