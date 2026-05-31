// apps/api/src/features/import/leetcode.routes.ts

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  connectLeetCodeHandler,
  getLeetCodeStatusHandler,
  getLeetCodeSummaryHandler,
  syncLeetCodeHandler,
  toggleDoubtfulHandler,
  manualImportHandler,
} from "./leetcode.controller.js";
import {
  connectLeetCodeBodySchema,
  toggleDoubtfulBodySchema,
  manualImportBodySchema,
} from "./leetcode.schemas.js";

export const leetcodeImportRouter = Router();

leetcodeImportRouter.use(requireAuth);

leetcodeImportRouter.get("/status", (req, res, next) => {
  void getLeetCodeStatusHandler(req, res).catch(next);
});

leetcodeImportRouter.post(
  "/connect",
  validate("body", connectLeetCodeBodySchema),
  (req, res, next) => {
    void connectLeetCodeHandler(req, res).catch(next);
  },
);

leetcodeImportRouter.post("/sync", (req, res, next) => {
  void syncLeetCodeHandler(req, res).catch(next);
});

leetcodeImportRouter.post(
  "/manual",
  validate("body", manualImportBodySchema),
  (req, res, next) => {
    void manualImportHandler(req, res).catch(next);
  },
);

leetcodeImportRouter.get("/summary", (req, res, next) => {
  void getLeetCodeSummaryHandler(req, res).catch(next);
});

leetcodeImportRouter.patch(
  "/user-problems/:id/doubtful",
  validate("body", toggleDoubtfulBodySchema),
  (req, res, next) => {
    void toggleDoubtfulHandler(req, res).catch(next);
  },
);
