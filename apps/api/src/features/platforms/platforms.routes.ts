// apps/api/src/features/platforms/platforms.routes.ts

import { Router } from "express";
import { listPlatforms } from "./platforms.service.js";

export const platformsRouter = Router();

/**
 * GET /api/v1/platforms — list all platforms (public)
 */
platformsRouter.get("/", (_req, res, next) => {
  listPlatforms()
    .then((result) => {
      if (!result.ok) {
        res.status(500).json({ error: "Failed to list platforms" });
        return;
      }
      res.status(200).json({ platforms: result.value });
    })
    .catch(next);
});
