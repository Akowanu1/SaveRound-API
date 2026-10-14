# Security check (C5)

## 1. Confirm in app.js
- `app.use(helmet())`
- CORS limited to the origins in `CLIENT_URL` (comma-separated) plus `http://localhost:3000` outside production
- `express.json({ limit: "10kb" })`
- Rate limiter on `/api/auth` only
- `app.set("trust proxy", 1)` for Render

## 2. Confirm the ignore rules
```bash
git check-ignore -v .env node_modules      # both must print a rule
git ls-files | grep -E "^\.env$"           # must print nothing
```
`.env.example` must list every variable with an empty value.

## 3. Search for hard-coded secrets and URLs
```bash
grep -rnEi "(password|secret|api[_-]?key|token)\s*[:=]\s*['\"][^'\"]+['\"]" src app.js
grep -rnE "https?://" src app.js | grep -v localhost
grep -rnE "mongodb(\+srv)?://" src app.js
```
Report every hit to the file's owner (Group A, Group B or the Team Lead). Test files and docs may contain examples; check each one.

## 4. Test it (server running on port 4000)
```bash
# Rate limit: the 21st call within 15 minutes should return 429
for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code} " -X POST localhost:4000/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"a@b.com","password":"wrong"}'; done; echo

# CORS: an unlisted origin must be blocked (403)
curl -i -H "Origin: https://evil.example" localhost:4000/health
```
Tip: set `AUTH_RATE_LIMIT_MAX=3` in `.env` while testing so you see the 429 quickly, then change it back.
