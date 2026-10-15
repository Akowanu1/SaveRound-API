# Troubleshooting

Add a row to the second table for every problem found on this project, and how it was fixed.

## Common problems and fixes

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `Cannot find module` in the Render logs | A package is missing from `package.json`, an import has no `.js` extension, or a file name has the wrong letter case (Render runs Linux, which is case sensitive: `User.js` is not `user.js`) | Run `npm install <package>` and commit `package.json`; add `.js`; match the exact file name |
| Database connection failed | Atlas blocks Render's IP, `MONGO_URI` is wrong, or the password has special characters | Atlas > Network Access: allow Render (often `0.0.0.0/0` on the free plan); recheck `MONGO_URI`; URL-encode special characters in the password |
| App crashes on start with a missing variable | A variable is not set on Render | Compare `.env.example` with Render's Environment tab and add the missing name |
| Browser requests blocked by CORS | `CLIENT_URL` is missing, has a typo, or ends with `/` | Set `CLIENT_URL` to the exact front-end address (comma-separated for several) |
| First request takes 30 to 60 seconds | Render's free plan sleeps when idle | Normal. Retry; the next requests are fast |
| Verification emails do not arrive | `EMAIL_FROM` is not a verified sender in Brevo, or `BREVO_API_KEY` is wrong | Verify the sender in Brevo; check the Brevo logs; check the spam folder |
| Everyone gets 429 Too many attempts | `trust proxy` not set, so all users share one IP | Confirm `app.set("trust proxy", 1)` in `app.js` |
| Image upload fails on Render | `CLOUDINARY_*` variables missing or wrong | Compare with `.env.example` and recheck the values with the Team Lead |

## Problems found on this project

| Date | Problem | Where found | Cause | Fix | Fixed by |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |
