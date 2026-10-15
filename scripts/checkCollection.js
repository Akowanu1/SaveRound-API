// Weekly check: does the Postman collection match the routes in the code?
// Run from the project root:  node scripts/checkCollection.js
// Exits with code 1 when something is missing, so it can also run in CI.
import fs from "node:fs";
import path from "node:path";

const COLLECTION = "docs/AJO.postman_collection.json";
const ROUTES_DIR = "src/routes";

// Where each route file is mounted in app.js
const PREFIXES = {
  "authRoutes.js": "/api/auth",
  "userRoutes.js": "/api/users",
  "groupRoutes.js": "/api/groups",
  "contributionRoutes.js": "/api",
};

// ---- Endpoints found in the code ----
const inCode = new Set(["GET /health"]);
const routeRegex = /router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]*)["'`]/g;

for (const [file, prefix] of Object.entries(PREFIXES)) {
  const filePath = path.join(ROUTES_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: ${filePath} not found (skipped)`);
    continue;
  }
  const source = fs.readFileSync(filePath, "utf8");
  for (const match of source.matchAll(routeRegex)) {
    const routePath = match[2] === "/" ? "" : match[2];
    inCode.add(`${match[1].toUpperCase()} ${prefix}${routePath}`);
  }
}

// ---- Endpoints found in the collection ----
const inCollection = new Set();
const walk = (items) => {
  for (const it of items) {
    if (it.item) walk(it.item);
    else if (it.request) {
      inCollection.add(`${it.request.method} /${it.request.url.path.join("/")}`);
    }
  }
};
walk(JSON.parse(fs.readFileSync(COLLECTION, "utf8")).item);

// ---- Compare ----
const missingInCollection = [...inCode].filter((e) => !inCollection.has(e)).sort();
const missingInCode = [...inCollection].filter((e) => !inCode.has(e)).sort();

console.log(`Code: ${inCode.size} endpoints | Collection: ${inCollection.size} requests`);
if (missingInCollection.length) {
  console.log("\nIn the code but NOT in the collection (add them):");
  missingInCollection.forEach((e) => console.log("  " + e));
}
if (missingInCode.length) {
  console.log("\nIn the collection but NOT in the code (not merged yet, or remove them):");
  missingInCode.forEach((e) => console.log("  " + e));
}
if (!missingInCollection.length && !missingInCode.length) {
  console.log("\nThe collection matches the code.");
} else {
  process.exitCode = 1;
}
