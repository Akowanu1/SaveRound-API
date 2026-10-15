// Daily review queue. Shows open pull requests and flags the ones that need attention.
// Needs the GitHub CLI, logged in once with:  gh auth login
// Run from the repository folder:  node scripts/reviewQueue.js
import { execFileSync } from "node:child_process";

const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });

// Patterns that suggest a secret was added to the code
const SECRET_PATTERNS = [
  /mongodb(\+srv)?:\/\/[^\s:@]+:[^\s@]+@/i,
  /(secret|password|api[_-]?key|token)\s*[:=]\s*["'][^"']{8,}["']/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(JWT_SECRET_KEY|CLOUDINARY_API_SECRET|BREVO_API_KEY|MONGO_URI)\s*=\s*\S+/,
];

const prs = JSON.parse(
  gh("pr", "list", "--state", "open", "--limit", "100",
    "--json", "number,title,author,baseRefName,createdAt,isDraft,files")
);

if (prs.length === 0) {
  console.log("No open pull requests.");
  process.exit(0);
}

const hoursOld = (iso) => (Date.now() - new Date(iso).getTime()) / 3_600_000;
let attention = 0;

for (const pr of prs) {
  if (pr.isDraft) continue;
  const flags = [];
  const age = hoursOld(pr.createdAt);
  const files = pr.files.map((f) => f.path);

  if (age > 24) flags.push(`waiting ${Math.floor(age)}h (review today)`);
  if (pr.baseRefName === "main") flags.push("TARGETS MAIN: tell the Team Lead");
  if (files.some((p) => p.startsWith("src/models/"))) {
    flags.push("changes models: check the author owns them");
  }
  if (files.some((p) => p === ".env" || p.endsWith("/.env"))) {
    flags.push("CONTAINS A .env FILE: tell the Team Lead");
  }

  // Look only at lines the pull request adds
  const added = gh("pr", "diff", String(pr.number))
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  if (added.some((l) => SECRET_PATTERNS.some((re) => re.test(l)))) {
    flags.push("POSSIBLE SECRET in the diff: do not merge, tell the Team Lead");
  }

  if (flags.length) attention += 1;
  console.log(`#${pr.number}  ${pr.title}  (${pr.author?.login}, into ${pr.baseRefName}, ${Math.floor(age)}h old)`);
  console.log(flags.length ? flags.map((f) => `    ! ${f}`).join("\n") : "    ok");
}

console.log(`\n${prs.length} open pull request(s), ${attention} need attention.`);
