import cors from "cors";
import express from "express";
import applicationRoutes from "./routes/applicationRoutes";
import { mockAuth } from "./utils/auth";

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN;

app.use(
  cors({
    origin: frontendOrigin || true,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(mockAuth);
app.use("/api", applicationRoutes);

export default app;
