# Pull request review guide

Review every open pull request within one day. Run `node scripts/reviewQueue.js` each morning to see the queue and the flags below.

## Who owns what
| Area | Owner |
| --- | --- |
| User, SavingsGroup, Membership models, auth and group code | Group A |
| Contribution model, contribution code, `utils/cycle.js` | Group B |
| Error handling, email, uploads, security, seed, docs, tests | Group C |
| `main` branch, Atlas, Cloudinary, Render | Team Lead |

## Checklist
**Branch and process**
- [ ] Opened into `develop` (never `main`)
- [ ] Branch name looks like `feature/<group>-<name>`; commit messages use `feat(area):`, `fix(area):`, `docs:`, `refactor(area):`
- [ ] Reviewer is from a different group

**Safety**
- [ ] No `.env` file, passwords, API keys, tokens or the Cloudinary secret
- [ ] No hard-coded URLs or secrets; values come from environment variables
- [ ] New variables are added to `.env.example` with empty values

**Code**
- [ ] ES modules, and imports end in `.js`
- [ ] `const` by default, no `var`, no leftover `console.log`
- [ ] Uses `async/await`, `throw new ApiError(...)` and `sendSuccess`; no raw `res.json`
- [ ] Input validated at the start of every controller
- [ ] User comes from `req.user`, creator from the token, never from the request body
- [ ] No `password`, `verificationToken` or other sensitive field in a response
- [ ] Repeated logic moved to `utils/`
- [ ] Comments explain why, not what

**Business rules (R1 to R15)**
- [ ] Rules are enforced on the server, with the right status codes (400, 401, 403, 404, 409)

**Ownership**
- [ ] Models are only changed by their owner group (or the owner approved it in the PR)

## Leaving comments
Be kind and specific: say what is wrong and how to fix it.

- Instead of: "This is wrong."
- Write: "`groupId` comes from `req.body` here. Take the creator from `req.user._id` instead, so a user cannot act for someone else."
- Instead of: "Bad naming."
- Write: "Can we rename `d` to `contribution`? It makes the 409 check on line 40 easier to read."

## Escalate to the Team Lead
- Any pull request that targets or touches `main`
- Any pull request that contains a secret. Do not merge it. Deleting the file later does not remove it from Git history, so the secret must be replaced.
