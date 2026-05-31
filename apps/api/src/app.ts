// apps/api/src/app.ts

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { loadEnv } from "./config/env.js";
import { authRouter } from "./features/auth/auth.routes.js";
import { healthRouter } from "./features/health/health.routes.js";
import { platformsRouter } from "./features/platforms/platforms.routes.js";
import { problemsRouter } from "./features/problems/problems.routes.js";
import { tagsRouter } from "./features/tags/tags.routes.js";
import { notesRouter } from "./features/notes/notes.routes.js";
import { mistakesRouter } from "./features/mistakes/mistakes.routes.js";
import { revisionsRouter } from "./features/revisions/revisions.routes.js";
import { statsRouter } from "./features/stats/stats.routes.js";
import { initFirebase } from "./lib/firebase.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { seedPlatforms } from "./features/platforms/platforms.service.js";

/**
 * Creates and configures the Express application.
 */
export function createApp(): express.Application {
  const env = loadEnv();
  initFirebase();

  const app = express();

  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        if (origin.endsWith(".vercel.app")) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy blocked request from ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const v1 = express.Router();
  v1.use("/health", healthRouter);
  v1.use("/auth", authRouter);
  v1.use("/platforms", platformsRouter);
  v1.use("/problems", problemsRouter);
  v1.use("/tags", tagsRouter);
  v1.use("/notes", notesRouter);
  v1.use("/mistakes", mistakesRouter);
  v1.use("/revisions", revisionsRouter);
  v1.use("/stats", statsRouter);

  app.use("/api/v1", v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  // Seed default data on startup
  void seedPlatforms().catch((err) => {
    console.warn("[codevault-api] Platform seeding failed:", err);
  });

  return app;
}
