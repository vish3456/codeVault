// apps/api/src/features/mistakes/mistakes.routes.ts

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate, getValidatedBody } from "../../middleware/validate.js";
import {
  createMistake,
  deleteMistake,
  listMistakes,
} from "./mistakes.service.js";
import {
  createMistakeBodySchema,
  listMistakesQuerySchema,
  type CreateMistakeBody,
  type ListMistakesQuery,
} from "./mistakes.schemas.js";

export const mistakesRouter = Router();

mistakesRouter.use(requireAuth);

mistakesRouter.post(
  "/",
  validate("body", createMistakeBodySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const body = getValidatedBody<CreateMistakeBody>(req);
    createMistake(userId, body)
      .then((result) => {
        if (!result.ok) {
          res.status(400).json({ error: result.error.message });
          return;
        }
        res.status(201).json({ mistake: result.value });
      })
      .catch(next);
  },
);

mistakesRouter.get(
  "/",
  validate("query", listMistakesQuerySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const query = req.validatedQuery as ListMistakesQuery;
    listMistakes(userId, query)
      .then((result) => {
        if (!result.ok) {
          res.status(500).json({ error: result.error.message });
          return;
        }
        res.status(200).json(result.value);
      })
      .catch(next);
  },
);

mistakesRouter.delete("/:id", (req, res, next) => {
  const userId = req.auth!.userId;
  const mistakeId = req.params["id"]!;
  deleteMistake(userId, mistakeId)
    .then((result) => {
      if (!result.ok) {
        res.status(404).json({ error: result.error.message });
        return;
      }
      res.status(204).send();
    })
    .catch(next);
});
