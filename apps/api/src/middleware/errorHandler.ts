// apps/api/src/middleware/errorHandler.ts

import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { createProblem } from "../types/problem.js";

/**
 * 404 handler for unknown routes (RFC 7807).
 */
export const notFoundHandler: RequestHandler = (req, res) => {
  const problem = createProblem({
    type: "https://codevault.dev/problems/not-found",
    title: "Not Found",
    status: 404,
    detail: `No route for ${req.method} ${req.path}`,
    instance: req.originalUrl,
  });
  res.status(404).type("application/problem+json").json(problem);
};

/**
 * Global error handler — maps known errors to Problem Details.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    const problem = createProblem({
      type: "https://codevault.dev/problems/validation-error",
      title: "Validation Error",
      status: 400,
      detail: "Request validation failed.",
      instance: req.originalUrl,
      extensions: { errors: err.flatten() },
    });
    res.status(400).type("application/problem+json").json(problem);
    return;
  }

  console.error("[api] unhandled error", err);

  const problem = createProblem({
    type: "https://codevault.dev/problems/internal-error",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred.",
    instance: req.originalUrl,
  });
  res.status(500).type("application/problem+json").json(problem);
};
