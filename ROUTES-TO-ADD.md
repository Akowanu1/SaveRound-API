# Add these lines to the existing route files (agree placement with Group A's lead first)

## src/routes/userRoutes.js
```js
import upload from "../middlewares/upload.js";
import { uploadAvatar } from "../controllers/imageController.js";
// ...
router.put("/me/avatar", protect, upload.single("image"), uploadAvatar);
```

## src/routes/groupRoutes.js
```js
import upload from "../middlewares/upload.js";
import { uploadGroupImage } from "../controllers/imageController.js";
// ...
router.post("/:groupId/image", protect, upload.single("image"), uploadGroupImage);
```
`protect` is imported from "../middlewares/authMiddleware.js" (already imported in both files by Group A).
