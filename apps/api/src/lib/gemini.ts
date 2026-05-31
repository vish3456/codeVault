// apps/api/src/lib/gemini.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadEnv } from "../config/env.js";

let client: GoogleGenerativeAI | null | undefined;

/**
 * Returns a Gemini client when GEMINI_API_KEY is configured; otherwise null.
 */
export function getGeminiClient(): GoogleGenerativeAI | null {
  if (client !== undefined) {
    return client;
  }
  const apiKey = loadEnv().GEMINI_API_KEY;
  client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  return client;
}

/**
 * Whether live Gemini reasoning is available.
 */
export function isGeminiEnabled(): boolean {
  return getGeminiClient() !== null;
}
