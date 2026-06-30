import cors from "cors";
import express from "express";
import applicationRoutes from "./routes/applicationRoutes";
import { mockAuth } from "./utils/auth";

const app = express();

app.use(cors());
app.use(express.json());
app.use(mockAuth);
app.use("/api", applicationRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export default app;
