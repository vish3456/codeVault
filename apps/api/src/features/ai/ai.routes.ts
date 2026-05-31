// apps/api/src/features/ai/ai.routes.ts

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  getInsightsHandler,
  refreshInsightsHandler,
  getProblemHintsHandler,
  coachChatHandler,
} from "./ai.controller.js";

export const aiRouter = Router();

// Secure all AI endpoints
aiRouter.use(requireAuth);

aiRouter.get("/insights", (req, res, next) => {
  void getInsightsHandler(req, res).catch(next);
});

aiRouter.post("/insights/refresh", (req, res, next) => {
  void refreshInsightsHandler(req, res).catch(next);
});

aiRouter.get("/problems/:id/hints", (req, res, next) => {
  void getProblemHintsHandler(req, res).catch(next);
});

aiRouter.post("/coach/chat", (req, res, next) => {
  void coachChatHandler(req, res).catch(next);
});
