// apps/api/src/features/stats/stats.routes.ts

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getOverview } from "./stats.service.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);

statsRouter.get("/overview", (req, res, next) => {
  const userId = req.auth!.userId;
  getOverview(userId)
    .then((result) => {
      if (!result.ok) {
        res.status(500).json({ error: result.error.message });
        return;
      }
      res.status(200).json({ stats: result.value });
    })
    .catch(next);
});
