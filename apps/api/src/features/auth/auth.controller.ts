// apps/api/src/features/auth/auth.controller.ts

import type { Request, Response } from "express";
import { loadEnv } from "../../config/env.js";
import {
  ACCESS_TOKEN_COOKIE,
  authCookieOptions,
  cookieMaxAge,
  REFRESH_TOKEN_COOKIE,
} from "../../lib/jwt.js";
import { createProblem } from "../../types/problem.js";
import { getValidatedBody } from "../../middleware/validate.js";
import type { AuthServiceError } from "./auth.errors.js";
import {
  loginWithFirebase,
  logout,
  refreshSession,
} from "./auth.service.js";
import type { FirebaseAuthBody } from "./auth.schemas.js";

/**
 * POST /api/v1/auth/firebase — exchange Firebase ID token for JWT cookies.
 */
export async function firebaseAuthHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { idToken } = getValidatedBody<FirebaseAuthBody>(req);
  const result = await loginWithFirebase(idToken);

  if (!result.ok) {
    sendAuthError(res, result.error);
    return;
  }

  setAuthCookies(res, result.value.tokens);
  res.status(200).json({
    user: result.value.user,
  });
}

/**
 * POST /api/v1/auth/refresh — rotate access + refresh tokens.
 */
export async function refreshHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
    | string
    | undefined;

  if (!refreshToken) {
    const problem = createProblem({
      type: "https://codevault.dev/problems/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Refresh token cookie is required.",
    });
    res.status(401).type("application/problem+json").json(problem);
    return;
  }

  const result = await refreshSession(refreshToken);
  if (!result.ok) {
    sendAuthError(res, result.error);
    return;
  }

  setAuthCookies(res, result.value);
  res.status(200).json({ ok: true });
}

/**
 * POST /api/v1/auth/logout — clear cookies and revoke refresh session.
 */
export async function logoutHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
    | string
    | undefined;
  const userId = req.auth?.userId;

  await logout(refreshToken, userId);

  clearAuthCookies(res);
  res.status(200).json({ ok: true });
}

function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const secure = loadEnv().NODE_ENV === "production";
  const base = authCookieOptions(secure);

  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: cookieMaxAge.access,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: cookieMaxAge.refresh,
  });
}

function clearAuthCookies(res: Response): void {
  const secure = loadEnv().NODE_ENV === "production";
  const base = authCookieOptions(secure);
  res.clearCookie(ACCESS_TOKEN_COOKIE, base);
  res.clearCookie(REFRESH_TOKEN_COOKIE, base);
}

function sendAuthError(res: Response, error: AuthServiceError): void {
  const statusMap: Record<AuthServiceError["code"], number> = {
    INVALID_FIREBASE_TOKEN: 401,
    INVALID_REFRESH_TOKEN: 401,
    REFRESH_SESSION_REVOKED: 401,
    USER_PROVISION_FAILED: 500,
    REFRESH_SESSION_STORE_FAILED: 503,
  };

  const typeMap: Record<AuthServiceError["code"], string> = {
    INVALID_FIREBASE_TOKEN:
      "https://codevault.dev/problems/invalid-firebase-token",
    INVALID_REFRESH_TOKEN:
      "https://codevault.dev/problems/invalid-refresh-token",
    REFRESH_SESSION_REVOKED:
      "https://codevault.dev/problems/refresh-session-revoked",
    USER_PROVISION_FAILED:
      "https://codevault.dev/problems/user-provision-failed",
    REFRESH_SESSION_STORE_FAILED:
      "https://codevault.dev/problems/session-store-unavailable",
  };

  const status = statusMap[error.code];
  const problem = createProblem({
    type: typeMap[error.code],
    title: error.code.replace(/_/g, " "),
    status,
    detail: error.message,
  });

  res.status(status).type("application/problem+json").json(problem);
}
