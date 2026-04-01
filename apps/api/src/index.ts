import http from "http";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import cron from "node-cron";

import { env } from "./config/env";
import sessionRouter from "./routes/session";
import analyticsRouter from "./routes/analytics";
import callbackRouter from "./routes/callback";
import followupRouter from "./routes/followup";
import tavusWebhookRouter from "./routes/tavus-webhook";
import analyzeRouter from "./routes/analyze";
import { initIo } from "./socket/io";
import { initChatNamespace } from "./socket/chat";
import { runPredictiveAnalysis } from "./services/predictive";

const app = express();
const port = env.PORT;

// CORS for web app
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);

// Logging
app.use(morgan("tiny"));

// JSON body parsing
app.use(express.json());

// Health route
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "api", port });
});

// v1 routes
const v1Router = express.Router();
v1Router.use("/session", sessionRouter);
v1Router.use("/analytics", analyticsRouter);
v1Router.use("/callback", callbackRouter);

// Webhook + analyze registered directly (not under /session prefix)
app.use("/v1", tavusWebhookRouter);
app.use("/v1", analyzeRouter);
app.use("/v1", followupRouter);
app.use("/v1", v1Router);

// Manual predictive analysis trigger (for testing)
app.post("/v1/admin/predictive-analysis", (_req: Request, res: Response) => {
  runPredictiveAnalysis().catch(console.error);
  res.json({ ok: true, message: "Predictive analysis started in background" });
});

// Global 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: { message: "Not Found", path: req.path } });
});

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ ok: false, error: { message: "Internal Server Error" } });
});

const server = http.createServer(app);
const io = initIo(server);
initChatNamespace(io);

// Predictive dropout analysis — runs daily at 6:00 AM
cron.schedule("0 6 * * *", () => {
  // eslint-disable-next-line no-console
  console.log("⏰ Scheduled predictive analysis triggered");
  runPredictiveAnalysis().catch(console.error);
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
