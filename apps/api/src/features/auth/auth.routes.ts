// apps/api/src/features/auth/auth.routes.ts

import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  firebaseAuthHandler,
  logoutHandler,
  refreshHandler,
} from "./auth.controller.js";
import { firebaseAuthBodySchema } from "./auth.schemas.js";

/** Auth feature routes under /api/v1/auth */
export const authRouter = Router();

authRouter.post(
  "/firebase",
  validate("body", firebaseAuthBodySchema),
  (req, res, next) => {
    void firebaseAuthHandler(req, res).catch(next);
  },
);

authRouter.post("/refresh", (req, res, next) => {
  void refreshHandler(req, res).catch(next);
});

authRouter.post("/logout", (req, res, next) => {
  void logoutHandler(req, res).catch(next);
});
