// apps/api/src/features/ai/ai.controller.ts

import type { Request, Response } from "express";
import { AICoachService } from "./ai.service.js";
import { createProblem } from "../../types/problem.js";

const aiCoachService = new AICoachService();

/**
 * GET /ai/insights
 * Returns computed metrics: weakness map, readiness score, and topic clusters
 */
export async function getInsightsHandler(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.userId;
  const forceRefresh = req.query["refresh"] === "true";

  const result = await aiCoachService.getOrGenerateInsights(userId, forceRefresh);

  if (!result.ok) {
    res.status(500).json(
      createProblem({
        type: "https://codevault.dev/problems/internal-error",
        title: "AI Insights Computation Failed",
        status: 500,
        detail: result.error.message,
      })
    );
    return;
  }

  res.status(200).json({ insights: result.value });
}

/**
 * POST /ai/insights/refresh
 * Forces re-computation of AI diagnostics
 */
export async function refreshInsightsHandler(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.userId;

  const result = await aiCoachService.getOrGenerateInsights(userId, true);

  if (!result.ok) {
    res.status(500).json(
      createProblem({
        type: "https://codevault.dev/problems/internal-error",
        title: "AI Insights Re-computation Failed",
        status: 500,
        detail: result.error.message,
      })
    );
    return;
  }

  res.status(200).json({ insights: result.value });
}

/**
 * GET /ai/problems/:id/hints
 * Progressive hints retrieval for problem details modal
 */
export async function getProblemHintsHandler(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.userId;
  const problemId = req.params["id"] as string;

  const result = await aiCoachService.getProblemHints(userId, problemId);

  if (!result.ok) {
    res.status(500).json(
      createProblem({
        type: "https://codevault.dev/problems/internal-error",
        title: "Hints Generation Failed",
        status: 500,
        detail: result.error.message,
      })
    );
    return;
  }

  res.status(200).json({ hints: result.value });
}

/**
 * POST /ai/coach/chat
 * Active interactive chatbot conversation endpoint
 */
export async function coachChatHandler(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.userId;
  const { message, history, problemId } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json(
      createProblem({
        type: "https://codevault.dev/problems/validation-error",
        title: "Bad Request",
        status: 400,
        detail: "Message is a required string in the body.",
      })
    );
    return;
  }

  const result = await aiCoachService.chatWithCoach(
    userId,
    message,
    Array.isArray(history) ? history : [],
    typeof problemId === "string" ? problemId : undefined
  );

  if (!result.ok) {
    res.status(500).json(
      createProblem({
        type: "https://codevault.dev/problems/internal-error",
        title: "AI Coach Chatbot Error",
        status: 500,
        detail: result.error.message,
      })
    );
    return;
  }

  res.status(200).json({ reply: result.value });
}
