import multer from "multer";
import ApiError from "../utils/ApiError.js";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// memoryStorage: files are never written to the server disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new ApiError(400, "Only JPEG, PNG and WebP images are allowed"));
    }
    cb(null, true);
  },
});

export default upload;
