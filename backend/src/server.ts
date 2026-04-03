import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import summariesRoutes from "./routes/summaries";

const app = express();
const PORT = 3001;

// Basic middleware stack for JSON APIs.
app.use(cors());
app.use(express.json());

// Mount authentication endpoints under /api/auth.
app.use("/api/auth", authRoutes);
app.use("/api/summaries", summariesRoutes);

// Health endpoint for local/dev checks.
app.get("/", (_req, res) => {
  res.send("API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});