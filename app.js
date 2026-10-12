import "dotenv/config"; // must be first so every other file can read process.env
import express from "express";
import cors from "cors";
import helmet from "helmet";
//import rateLimit from "express-rate-limit";
import connectDb from "./src/config/db.js";
import ApiError from "./src/utils/ApiError.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import groupRoutes from "./src/routes/groupRoutes.js";
import contributionRoutes from "./src/routes/contributionRoutes.js";
import { notFound, errorHandler } from "./src/middlewares/errorHandler.js";

const app = express();


// Behind Render's proxy, so rate limiting sees the real client IP.
app.set("trust proxy", 1);
app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
if (process.env.NODE_ENV !== "production") allowedOrigins.push("http://localhost:3000");

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = Postman / server-to-server, which CORS does not apply to.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new ApiError(403, "Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ success: false, message: "Too many attempts, try again later", data: {} }),
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api", contributionRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

export default app;
