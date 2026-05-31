// apps/api/src/features/revisions/revisions.routes.ts

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate, getValidatedBody } from "../../middleware/validate.js";
import {
  createRevision,
  completeRevision,
  getDueRevisions,
  getRevisionStats,
} from "./revisions.service.js";
import {
  createRevisionBodySchema,
  completeRevisionBodySchema,
  type CreateRevisionBody,
  type CompleteRevisionBody,
} from "./revisions.schemas.js";

export const revisionsRouter = Router();

revisionsRouter.use(requireAuth);

revisionsRouter.get("/due", (req, res, next) => {
  const userId = req.auth!.userId;
  getDueRevisions(userId)
    .then((result) => {
      if (!result.ok) {
        res.status(500).json({ error: result.error.message });
        return;
      }
      res.status(200).json({ revisions: result.value });
    })
    .catch(next);
});

revisionsRouter.get("/stats", (req, res, next) => {
  const userId = req.auth!.userId;
  getRevisionStats(userId)
    .then((result) => {
      if (!result.ok) {
        res.status(500).json({ error: result.error.message });
        return;
      }
      res.status(200).json({ stats: result.value });
    })
    .catch(next);
});

revisionsRouter.post(
  "/",
  validate("body", createRevisionBodySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const body = getValidatedBody<CreateRevisionBody>(req);
    createRevision(userId, body)
      .then((result) => {
        if (!result.ok) {
          res.status(400).json({ error: result.error.message });
          return;
        }
        res.status(201).json({ revision: result.value });
      })
      .catch(next);
  },
);

revisionsRouter.post(
  "/:id/complete",
  validate("body", completeRevisionBodySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const revisionId = req.params["id"] as string;
    const body = getValidatedBody<CompleteRevisionBody>(req);
    completeRevision(userId, revisionId, body.quality)
      .then((result) => {
        if (!result.ok) {
          res.status(404).json({ error: result.error.message });
          return;
        }
        res.status(200).json({ revision: result.value });
      })
      .catch(next);
  },
);
