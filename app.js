import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDb from "./src/config/db.js";

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) =>
  res.json({ success: true, message: "SaveRound-API is running", data: {} })
);
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

const PORT = process.env.PORT || 4000;
connectDb().then(() =>
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
);

export default app;