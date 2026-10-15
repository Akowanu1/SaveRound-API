# Test Plan

Run this plan on `develop` at the end of every phase, and in Phase 4 against the deployed Render URL. Use the Postman collection in `docs/`. Record results in the **Pass or fail** column (write PASS or FAIL) and put the bug details in **Notes**.

Report every FAIL to the group that owns the code, with exact steps and the response you got. Do not fix other groups' code.

Rules R1 to R15 are the business rules in the Reference document. Every rule has at least 4 cases: the normal case and cases that must be rejected.

## Test cases

### R1 | Unique, lowercase email

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R1-1 | Unique, lowercase email | Register with a new email. | 201, account created. |  |  |
| R1-2 | Unique, lowercase email | Register again with the same email. | 409, message says the email is already registered. |  |  |
| R1-3 | Unique, lowercase email | Register with `Test@Mail.COM`, then check the stored email (database or profile). | Stored as `test@mail.com`. |  |  |
| R1-4 | Unique, lowercase email | Register with the same email in different letter case (`TEST@mail.com`). | 409, treated as a duplicate. |  |  |

### R2 | Verify email before login

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R2-1 | Verify email before login | Register, then log in before verifying. | 401, cannot log in until the email is verified. |  |  |
| R2-2 | Verify email before login | Open the verification link, then log in. | 200 and a token is returned. |  |  |
| R2-3 | Verify email before login | Use a link older than 24 hours (set `verificationTokenExpiry` in the past in the database). | 400, link expired. |  | Ask Group A for the exact message. |
| R2-4 | Verify email before login | Use a made-up token, then use the resend endpoint and the new link. | Made-up token: 400. New link: 200 and login works. |  |  |

### R3 | Passwords hashed, never returned

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R3-1 | Passwords hashed, never returned | Register, then check the `password` field in the database. | Starts with `$2` (bcrypt), not the plain text. |  |  |
| R3-2 | Passwords hashed, never returned | Check the register response body. | No `password` field. |  |  |
| R3-3 | Passwords hashed, never returned | Check the login response and `GET /api/users/me`. | No `password` or `verificationToken` in either. |  |  |
| R3-4 | Passwords hashed, never returned | Log in with the correct password, then with a wrong one. | Correct: 200. Wrong: 401. |  |  |

### R4 | Group size 4 to 20

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R4-1 | Group size 4 to 20 | Create a group with `maxMembers` 4. | 201. |  |  |
| R4-2 | Group size 4 to 20 | Create a group with `maxMembers` 20. | 201. |  |  |
| R4-3 | Group size 4 to 20 | Create a group with `maxMembers` 3. | 400, size must be between 4 and 20. |  |  |
| R4-4 | Group size 4 to 20 | Create a group with `maxMembers` 21, then with 4.5. | Both 400. |  |  |

### R5 | Frequency values

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R5-1 | Frequency values | Create a group with `weekly`. | 201. |  |  |
| R5-2 | Frequency values | Create a group with `bi-weekly`, then `monthly`. | Both 201. |  |  |
| R5-3 | Frequency values | Create a group with `daily`. | 400. |  |  |
| R5-4 | Frequency values | Create a group with `Weekly` (capital) or `biweekly`. | 400, the value must match exactly. |  |  |

### R6 | Contribution amount

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R6-1 | Contribution amount | Create a group with `contributionAmount` 5000. | 201. |  |  |
| R6-2 | Contribution amount | Create a group with amount 0. | 400. |  |  |
| R6-3 | Contribution amount | Create a group with amount 2500.50. | 400, whole Naira only. |  |  |
| R6-4 | Contribution amount | Create a group with amount -100, then with `"abc"`. | Both 400. |  |  |

### R7 | Creator is member 1

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R7-1 | Creator is member 1 | Create a group, then `GET /api/groups/:groupId`. | Creator appears in the approved members. |  |  |
| R7-2 | Creator is member 1 | Check the creator's payout position. | Position is 1. |  |  |
| R7-3 | Creator is member 1 | Call `GET /api/groups/mine` as the creator. | The new group is listed. |  |  |
| R7-4 | Creator is member 1 | Creator calls `POST /join` on their own group. | 409, already a member. |  |  |

### R8 | One membership per group

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R8-1 | One membership per group | User 2 sends a join request. | Created (pending). |  |  |
| R8-2 | One membership per group | User 2 sends the join request again. | 409, duplicate request. |  |  |
| R8-3 | One membership per group | The creator tries to join their own group. | 409. |  |  |
| R8-4 | One membership per group | A user whose request was rejected tries to join again. | 409 (one record per group). |  | Confirm the expected behaviour with Group A. |

### R9 | Only the creator manages the group

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R9-1 | Only the creator manages the group | Creator calls `GET .../requests`. | 200 with the pending list. |  |  |
| R9-2 | Only the creator manages the group | A non-creator calls `GET .../requests`. | 403. |  |  |
| R9-3 | Only the creator manages the group | A non-creator calls approve, then reject. | Both 403. |  |  |
| R9-4 | Only the creator manages the group | A non-creator calls `POST .../start`. | 403. |  |  |

### R10 | No approvals when full or started

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R10-1 | No approvals when full or started | Creator approves a pending request while the group has space. | 200. |  |  |
| R10-2 | No approvals when full or started | Fill the group to `maxMembers`, then approve one more pending request. | 400, group is full. |  |  |
| R10-3 | No approvals when full or started | Start the group, then approve a pending request. | 400, group already started. |  |  |
| R10-4 | No approvals when full or started | Approve a user who never sent a request. | 404. |  |  |

### R11 | Payout positions

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R11-1 | Payout positions | Approve the first requester. | Gets position 2. |  |  |
| R11-2 | Payout positions | Approve the second and third requesters. | Get positions 3 and 4. |  |  |
| R11-3 | Payout positions | Reject one request, then approve the next requester. | Next position is used, with no gap. |  |  |
| R11-4 | Payout positions | After more approvals, read the group again. | Earlier members' positions are unchanged. |  |  |

### R12 | Start needs 4 approved members

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R12-1 | Start needs 4 approved members | Start a group with 3 approved members. | 400. |  |  |
| R12-2 | Start needs 4 approved members | Start a group with 4 approved members. | 200, status `active`, `startDate` set. |  |  |
| R12-3 | Start needs 4 approved members | After starting, send a join request or approve someone. | Rejected (400), the list is locked. |  |  |
| R12-4 | Start needs 4 approved members | Start the same group a second time. | 400, already started. |  |  |

### R13 | Recording a contribution

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R13-1 | Recording a contribution | Member of an active group records the exact amount. | 201. |  |  |
| R13-2 | Recording a contribution | Record a contribution in a group that has not started. | 400. |  |  |
| R13-3 | Recording a contribution | A non-member records a contribution. | 403. |  |  |
| R13-4 | Recording a contribution | Member records an amount different from the group's amount. | 400. |  |  |
| R13-5 | Recording a contribution | A member with a pending (not approved) request records one. | 403. |  |  |

### R14 | One contribution per cycle

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R14-1 | One contribution per cycle | Member records a second contribution in the same cycle. | 409. |  |  |
| R14-2 | One contribution per cycle | A different member records in the same cycle. | 201. |  |  |
| R14-3 | One contribution per cycle | Same member records in the next cycle (move `startDate` back in the database to reach it). | 201. |  |  |
| R14-4 | One contribution per cycle | Same member records in a different group, same cycle number. | 201. |  |  |

### R15 | Members see only their own groups

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| R15-1 | Members see only their own groups | Member calls `GET /api/groups/:groupId`. | 200. |  |  |
| R15-2 | Members see only their own groups | Non-member calls `GET /api/groups/:groupId`. | 403. |  | Confirm 403 vs 404 with Group A. |
| R15-3 | Members see only their own groups | Non-member calls the contributions list. | 403. |  |  |
| R15-4 | Members see only their own groups | Non-member calls summary and payout schedule. | Both 403. |  |  |
| R15-5 | Members see only their own groups | Call `GET /api/contributions/me`. | Returns only the caller's own contributions. |  |  |

### G | General and uploads

| ID | Feature | Steps | Expected result | Pass or fail | Notes |
| --- | --- | --- | --- | --- | --- |
| G-1 | General and uploads | Open an unknown URL. | JSON 404, not an HTML page. |  |  |
| G-2 | General and uploads | Use an invalid group ID in a URL. | 400, clean message. |  |  |
| G-3 | General and uploads | Call a protected endpoint with no token, then a broken token. | Both 401. |  |  |
| G-4 | General and uploads | Upload a JPG as avatar. | 200 with a Cloudinary URL. |  |  |
| G-5 | General and uploads | Upload a PDF, then a file over 2 MB. | Both 400 with friendly messages. |  |  |
| G-6 | General and uploads | A non-creator uploads a group image. | 403. |  |  |

## Results log

| Phase | Date | Run on | Passed | Failed | Bugs reported to |
| --- | --- | --- | --- | --- | --- |
| Phase 1 |  | develop |  |  |  |
| Phase 2 |  | develop |  |  |  |
| Phase 3 |  | develop |  |  |  |
| Phase 4 |  | Render URL |  |  |  |

## Release checks (deployment sign-off)

Completed by the person doing deployment checks after every release.

| Release date | /health ok | Env vars match Render | Render logs clean | Atlas access ok | Signed off by |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |
