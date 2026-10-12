# Using ApiError and the response helpers

Every endpoint returns the same JSON shape: `{ success, message, data }`.
Never call `res.json` directly. Throw `ApiError` for known problems and use `sendSuccess` for results.
Express 5 passes errors thrown in async handlers to the error handler, so you do not need try/catch.

```js
import ApiError from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
const group = await SavingsGroup.findById(req.params.groupId); // a bad ID returns a clean 400 automatically
if (!group) throw new ApiError(404, 'Group not found');
return sendSuccess(res, 200, 'Group fetched', { group });
```

## What is handled for you
| Problem | Status |
| --- | --- |
| Unknown URL | 404 |
| Mongoose validation error | 400 |
| Invalid ObjectId | 400 |
| Duplicate unique value (for example email) | 409 |
| Invalid or expired JWT | 401 |
| Malformed JSON body | 400 |
| Anything unexpected | 500 (details only in the server log) |
