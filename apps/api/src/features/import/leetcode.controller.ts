// apps/api/src/features/import/leetcode.controller.ts

import type { Request, Response } from "express";
import { getValidatedBody } from "../../middleware/validate.js";
import { createProblem } from "../../types/problem.js";
import {
  connectLeetCode,
  getLeetCodeStatus,
  getLeetCodeSummary,
  syncLeetCode,
  toggleDoubtful,
  importManualLeetCode,
} from "./leetcode.service.js";
import type {
  ConnectLeetCodeBody,
  ToggleDoubtfulBody,
  ManualImportBody,
} from "./leetcode.schemas.js";

export async function getLeetCodeStatusHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const result = await getLeetCodeStatus(userId);
  if (!result.ok) {
    res.status(500).type("application/problem+json").json(
      createProblem({
        type: "https://codevault.dev/problems/leetcode-status-failed",
        title: "Status Failed",
        status: 500,
        detail: result.error.message,
      }),
    );
    return;
  }
  res.status(200).json({ status: result.value });
}

export async function connectLeetCodeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const body = getValidatedBody<ConnectLeetCodeBody>(req);
  const result = await connectLeetCode(userId, body);
  if (!result.ok) {
    const status = result.error.message.includes("not found") ? 404 : 400;
    res.status(status).type("application/problem+json").json(
      createProblem({
        type: "https://codevault.dev/problems/leetcode-connect-failed",
        title: "Connect Failed",
        status,
        detail: result.error.message,
      }),
    );
    return;
  }
  res.status(200).json({ status: result.value });
}

export async function syncLeetCodeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const result = await syncLeetCode(userId);
  if (!result.ok) {
    res.status(400).type("application/problem+json").json(
      createProblem({
        type: "https://codevault.dev/problems/leetcode-sync-failed",
        title: "Sync Failed",
        status: 400,
        detail: result.error.message,
      }),
    );
    return;
  }
  res.status(200).json(result.value);
}

export async function getLeetCodeSummaryHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const result = await getLeetCodeSummary(userId);
  if (!result.ok) {
    const status = result.error.message.includes("not connected") ? 404 : 500;
    res.status(status).type("application/problem+json").json(
      createProblem({
        type: "https://codevault.dev/problems/leetcode-summary-failed",
        title: "Summary Failed",
        status,
        detail: result.error.message,
      }),
    );
    return;
  }
  res.status(200).json({ summary: result.value });
}

export async function toggleDoubtfulHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const userProblemId = req.params["id"] as string;
  const body = getValidatedBody<ToggleDoubtfulBody>(req);
  const result = await toggleDoubtful(userId, userProblemId, body.isDoubtful);
  if (!result.ok) {
    res.status(404).type("application/problem+json").json(
      createProblem({
        type: "https://codevault.dev/problems/not-found",
        title: "Not Found",
        status: 404,
        detail: result.error.message,
      }),
    );
    return;
  }
  res.status(200).json({ problem: result.value });
}

export async function manualImportHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.auth!.userId;
  const body = getValidatedBody<ManualImportBody>(req);
  const result = await importManualLeetCode(userId, body);
  if (!result.ok) {
    res.status(400).type("application/problem+json").json(
      createProblem({
        type: "https://codevault.dev/problems/leetcode-manual-sync-failed",
        title: "Bulk Sync Failed",
        status: 400,
        detail: result.error.message,
      }),
    );
    return;
  }
  res.status(200).json(result.value);
}
