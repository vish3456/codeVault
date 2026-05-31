// apps/api/src/middleware/validate.ts

import type { Request, RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { createProblem } from "../types/problem.js";

type RequestPart = "body" | "query" | "params" | "headers";

/**
 * Express middleware that validates a request part with Zod.
 * @param part - Which part of the request to validate
 * @param schema - Zod schema
 */
export function validate<T>(
  part: RequestPart,
  schema: ZodSchema<T>,
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const problem = createProblem({
        type: "https://codevault.dev/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Request validation failed.",
        extensions: {
          errors: result.error.flatten(),
        },
      });

      res
        .status(400)
        .type("application/problem+json")
        .json(problem);
      return;
    }

    assignValidated(req, part, result.data);
    next();
  };
}

function assignValidated<T>(
  req: Request,
  part: RequestPart,
  data: T,
): void {
  switch (part) {
    case "body":
      req.validatedBody = data;
      break;
    case "query":
      req.validatedQuery = data;
      break;
    case "params":
      req.validatedParams = data;
      break;
    case "headers":
      req.validatedHeaders = data;
      break;
  }
}

/** Typed access to validated body after validate('body', schema). */
export function getValidatedBody<T>(req: Request): T {
  if (req.validatedBody === undefined) {
    throw new Error("validatedBody missing — attach validate middleware first");
  }
  return req.validatedBody as T;
}
