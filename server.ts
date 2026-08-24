import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// The API routes live in api/ and are deployed as serverless functions on
// Vercel. Mount the same handlers here so local development and any
// self-hosted deployment run identical code — previously server.ts carried a
// second, drifting copy of the webhook and push logic.
import telegramWebhook from "./api/telegram-webhook";
import sendTelegram from "./api/send-telegram";
import sendPush from "./api/send-push";

const PORT = Number(process.env.PORT) || 3000;

/** Adapt an Express handler pair to the Vercel handler signature. */
const mount =
  (handler: (req: any, res: any) => unknown) =>
  async (req: express.Request, res: express.Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`Unhandled error in ${req.path}:`, error);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  };

async function startServer() {
  const app = express();

  // Reject oversized bodies instead of buffering whatever is posted.
  app.use(express.json({ limit: "100kb" }));

  app.post("/api/telegram-webhook", mount(telegramWebhook));
  app.post("/api/send-telegram", mount(sendTelegram));
  app.post("/api/send-push", mount(sendPush));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 4 uses '*'. The previous '*all' is Express 5 syntax and compiled
    // to a pattern matching only paths ending in "all", so every deep link
    // (/inbox, /groups/:id) returned 404 on refresh.
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
