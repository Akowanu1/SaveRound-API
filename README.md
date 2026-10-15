# SaveRound-API

"Logged in" means a valid token. "Creator" means the creator of that group. "Member" means an approved member of that group.

| Method | Path | Who can call it | What it does |
| --- | --- | --- | --- |
| GET | /health | Public | Returns { status: 'ok' } for Render's health check. |
| POST | /api/auth/register | Public | Creates an account and sends the verification email. |
| GET | /api/auth/verify-email | Public | Verifies the email using the token from the email link. |
| POST | /api/auth/resend-verification | Public | Sends a new verification link. |
| POST | /api/auth/login | Public | Returns a token and the user. The Tests tab saves the token automatically. |
| GET | /api/users/me | Logged in | Returns the current user's profile. |
| PUT | /api/users/me/avatar | Logged in | Uploads a profile picture to Cloudinary (JPG, PNG or WebP, max 2 MB). |
| POST | /api/groups | Logged in | Creates a group. The creator becomes approved member 1. |
| GET | /api/groups | Logged in | Lists open groups that still have space. |
| GET | /api/groups/mine | Logged in | Lists groups the user created or belongs to. |
| GET | /api/groups/:groupId | Logged in | Group details and approved members. |
| POST | /api/groups/:groupId/join | Logged in | Sends a join request (pending). |
| GET | /api/groups/:groupId/requests | Creator | Lists pending join requests. |
| PATCH | /api/groups/:groupId/members/:userId/approve | Creator | Approves a request and assigns the next payout position. |
| PATCH | /api/groups/:groupId/members/:userId/reject | Creator | Rejects a request. |
| POST | /api/groups/:groupId/start | Creator | Starts the group (needs at least 4 approved members) and locks the order. |
| POST | /api/groups/:groupId/image | Creator | Uploads the group image (JPG, PNG or WebP, max 2 MB). |
| POST | /api/groups/:groupId/contributions | Member | Records the member's contribution for the current cycle. |
| GET | /api/groups/:groupId/contributions | Member | Lists contributions; optional ?cycle=. |
| GET | /api/contributions/me | Logged in | The user's contribution history across groups. |
| GET | /api/groups/:groupId/summary | Member | Current cycle, recipient, who paid, totals. |
| GET | /api/groups/:groupId/payout-schedule | Member | Every cycle with its due date and recipient. |
