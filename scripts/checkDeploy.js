// Deployment check. Run it after every release.
//   node scripts/checkDeploy.js https://your-app.onrender.com [render-vars.txt]
//
// render-vars.txt (optional): the variable NAMES shown in Render's Environment tab,
// one per line. Do not paste the values.
// Exits with code 1 if any check fails.
import fs from "node:fs";

const [, , urlArg, varsFile] = process.argv;
if (!urlArg) {
  console.error("Usage: node scripts/checkDeploy.js <live-url> [render-vars.txt]");
  process.exit(1);
}
const base = urlArg.replace(/\/+$/, "");
let failures = 0;

const report = (ok, name, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " - " + detail : ""}`);
};

// The first request after Render's free plan sleeps can take up to a minute.
const get = async (path) => {
  const res = await fetch(base + path, { signal: AbortSignal.timeout(90_000) });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // not JSON
  }
  return { res, body };
};

try {
  // 1. Health check
  const health = await get("/health");
  report(
    health.res.status === 200 && health.body?.status === "ok",
    "/health returns { status: 'ok' }",
    `status ${health.res.status}`
  );

  // 2. Unknown routes return the standard JSON 404, not an HTML page
  const missing = await get("/api/this-route-does-not-exist");
  report(
    missing.res.status === 404 && missing.body?.success === false && "data" in (missing.body || {}),
    "Unknown URL returns the standard JSON 404",
    `status ${missing.res.status}`
  );

  // 3. helmet is active (the X-Powered-By header must be hidden)
  report(!health.res.headers.has("x-powered-by"), "X-Powered-By header is hidden (helmet)");

  // 4. A request from an unlisted origin must be blocked by CORS
  const evil = await fetch(base + "/health", {
    headers: { Origin: "https://not-allowed.example" },
    signal: AbortSignal.timeout(90_000),
  });
  report(evil.status === 403, "Unlisted origin is blocked by CORS", `status ${evil.status}`);
} catch (err) {
  report(false, "Could not reach the live URL", err.message);
}

// 5. Compare .env.example with the variable names on Render
if (varsFile) {
  const names = (text) =>
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split("=")[0].trim());

  const expected = names(fs.readFileSync(".env.example", "utf8"));
  const onRender = names(fs.readFileSync(varsFile, "utf8"));

  // Render sets PORT itself, so it does not need to be added by hand.
  const missing = expected.filter((n) => n !== "PORT" && !onRender.includes(n));
  const extra = onRender.filter((n) => !expected.includes(n));

  report(missing.length === 0, "Every variable in .env.example exists on Render",
    missing.length ? `missing: ${missing.join(", ")}` : "");
  if (extra.length) console.log(`NOTE  On Render but not in .env.example: ${extra.join(", ")}`);
} else {
  console.log("SKIP  Env var comparison (pass a render-vars.txt file as the second argument)");
}

console.log(failures ? `\n${failures} check(s) failed. Record them in docs/TROUBLESHOOTING.md.` : "\nAll checks passed. Sign off the release in docs/TEST_PLAN.md.");
process.exitCode = failures ? 1 : 0;
