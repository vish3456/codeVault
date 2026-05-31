// apps/api/src/features/problems/problems.routes.ts

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createProblemHandler,
  deleteProblemHandler,
  getProblemHandler,
  listProblemsHandler,
  updateProblemHandler,
} from "./problems.controller.js";
import {
  createProblemBodySchema,
  listProblemsQuerySchema,
  updateProblemBodySchema,
} from "./problems.schemas.js";

export const problemsRouter = Router();

problemsRouter.use(requireAuth);

problemsRouter.post(
  "/",
  validate("body", createProblemBodySchema),
  (req, res, next) => {
    void createProblemHandler(req, res).catch(next);
  },
);

problemsRouter.get(
  "/",
  validate("query", listProblemsQuerySchema),
  (req, res, next) => {
    void listProblemsHandler(req, res).catch(next);
  },
);

problemsRouter.get("/:id", (req, res, next) => {
  void getProblemHandler(req, res).catch(next);
});

problemsRouter.patch(
  "/:id",
  validate("body", updateProblemBodySchema),
  (req, res, next) => {
    void updateProblemHandler(req, res).catch(next);
  },
);

problemsRouter.delete("/:id", (req, res, next) => {
  void deleteProblemHandler(req, res).catch(next);
});
