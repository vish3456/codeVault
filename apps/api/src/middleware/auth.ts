// apps/api/src/middleware/auth.ts

import type { RequestHandler } from "express";
import {
  ACCESS_TOKEN_COOKIE,
  verifyAccessToken,
} from "../lib/jwt.js";
import { createProblem } from "../types/problem.js";

export interface AuthenticatedRequest {
  userId: string;
}

/**
 * Requires a valid access JWT (httpOnly cookie or Authorization: Bearer).
 * Attaches req.auth.userId for multi-tenant scoping.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
  const token = bearer ?? cookieToken;

  if (!token) {
    const problem = createProblem({
      type: "https://codevault.dev/problems/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Authentication required.",
    });
    res.status(401).type("application/problem+json").json(problem);
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    const problem = createProblem({
      type: "https://codevault.dev/problems/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Invalid or expired access token.",
    });
    res.status(401).type("application/problem+json").json(problem);
    return;
  }

  req.auth = { userId: payload.sub };
  next();
};
