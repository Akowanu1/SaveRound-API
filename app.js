import "dotenv/config"; // must be first so every other file can read process.env
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDb from "./src/config/db.js";
import ApiError from "./src/utils/ApiError.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import groupRoutes from "./src/routes/groupRoutes.js";
import contributionRoutes from "./src/routes/contributionRoutes.js";
import { notFound, errorHandler } from "./src/middlewares/errorHandler.js";

const app = express();

// Behind Render's proxy, so rate limiting sees the real client IP.
// Without this, every user would look like the same IP (the proxy's) and share one limit.
app.set("trust proxy", 1);

// helmet adds security headers (hides X-Powered-By, blocks MIME sniffing, and more).
app.use(helmet());

// --- CORS: which websites are allowed to call this API from a browser ---

// CLIENT_URL can hold several origins separated by commas.
// Split them, trim spaces, and drop empty entries.
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

// Allow the local front-end dev server only when not in production.
if (process.env.NODE_ENV !== "production") allowedOrigins.push("http://localhost:3000");

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = Postman / server-to-server, which CORS does not apply to.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      // Anything else is blocked. The ApiError reaches errorHandler as a JSON 403.
      callback(new ApiError(403, "Not allowed by CORS"));
    },
    // Lets the browser send cookies and auth headers with requests.
    credentials: true,
  })
);

// Parse JSON request bodies. The 10kb limit stops oversized payloads
// (errorHandler turns the resulting error into a 413).
app.use(express.json({ limit: "10kb" }));

// --- Rate limiting: protects login and register from brute-force guessing ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // time window: 15 minutes
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20, // max requests per IP per window (configurable)
  standardHeaders: true, // send modern RateLimit-* headers
  legacyHeaders: false, // do not send the old X-RateLimit-* headers
  // Custom response so a blocked request still uses the standard JSON shape (status 429).
  handler: (req, res) =>
    res.status(429).json({ success: false, message: "Too many attempts, try again later", data: {} }),
});

// Health check used by Render to confirm the app is alive.
app.get("/health", (req, res) => res.json({ status: "ok" }));

// --- Routes ---
// The rate limiter runs before the auth routes only, not the whole API.
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
// Contribution routes define their own full sub-paths
// (for example /groups/:groupId/contributions and /contributions/me).
app.use("/api", contributionRoutes);

// These two MUST stay last, after every route:
// notFound catches unknown URLs, then errorHandler formats every error.
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB first, then start listening, so the app never
// accepts requests before the database is ready.
const PORT = process.env.PORT || 4000;
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

export default app;