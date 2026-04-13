import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import summariesRoutes from "./routes/summariesController";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/summaries", summariesRoutes);

app.get("/", (_req, res) => {
  res.send("API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});