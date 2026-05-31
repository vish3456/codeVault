// apps/api/src/features/problems/problems.controller.ts

import type { Request, Response } from "express";
import { getValidatedBody } from "../../middleware/validate.js";
import { createProblem as createProblemFn } from "../../types/problem.js";
import {
  createProblem,
  deleteProblem,
  getProblem,
  listProblems,
  updateProblem,
} from "./problems.service.js";
import type {
  CreateProblemBody,
  ListProblemsQuery,
  UpdateProblemBody,
} from "./problems.schemas.js";

export async function createProblemHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const body = getValidatedBody<CreateProblemBody>(req);

  const result = await createProblem(userId, body);
  if (!result.ok) {
    res.status(500).json(
      createProblemFn({
        type: "https://codevault.dev/problems/internal-error",
        title: "Create Problem Failed",
        status: 500,
        detail: result.error.message,
      }),
    );
    return;
  }

  res.status(201).json({ problem: result.value });
}

export async function listProblemsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const query = req.validatedQuery as ListProblemsQuery;

  const result = await listProblems(userId, query);
  if (!result.ok) {
    res.status(500).json(
      createProblemFn({
        type: "https://codevault.dev/problems/internal-error",
        title: "List Problems Failed",
        status: 500,
        detail: result.error.message,
      }),
    );
    return;
  }

  res.status(200).json(result.value);
}

export async function getProblemHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const problemId = req.params["id"] as string;

  const result = await getProblem(userId, problemId);
  if (!result.ok) {
    res.status(500).json(
      createProblemFn({
        type: "https://codevault.dev/problems/internal-error",
        title: "Get Problem Failed",
        status: 500,
        detail: result.error.message,
      }),
    );
    return;
  }

  if (!result.value) {
    res.status(404).json(
      createProblemFn({
        type: "https://codevault.dev/problems/not-found",
        title: "Problem Not Found",
        status: 404,
        detail: `Problem ${problemId} not found.`,
      }),
    );
    return;
  }

  res.status(200).json({ problem: result.value });
}

export async function updateProblemHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const problemId = req.params["id"] as string;
  const body = getValidatedBody<UpdateProblemBody>(req);

  const result = await updateProblem(userId, problemId, body);
  if (!result.ok) {
    res.status(500).json(
      createProblemFn({
        type: "https://codevault.dev/problems/internal-error",
        title: "Update Problem Failed",
        status: 500,
        detail: result.error.message,
      }),
    );
    return;
  }

  res.status(200).json({ problem: result.value });
}

export async function deleteProblemHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const problemId = req.params["id"] as string;

  const result = await deleteProblem(userId, problemId);
  if (!result.ok) {
    res.status(500).json(
      createProblemFn({
        type: "https://codevault.dev/problems/internal-error",
        title: "Delete Problem Failed",
        status: 500,
        detail: result.error.message,
      }),
    );
    return;
  }

  res.status(204).send();
}
