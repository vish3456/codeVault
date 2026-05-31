// apps/api/src/features/health/health.routes.ts

import { Router } from "express";
import { loadEnv } from "../../config/env.js";

/** Health check routes */
export const healthRouter = Router();

/**
 * GET /api/v1/health — liveness probe
 */
healthRouter.get("/", (_req, res) => {
  const env = loadEnv();
  res.status(200).json({
    status: "ok",
    service: "codevault-api",
    version: "0.1.0",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});
