// apps/api/src/lib/jwt.ts

import jwt from "jsonwebtoken";
import { loadEnv } from "../config/env.js";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
  jti: string;
}

/**
 * Signs a short-lived access JWT for the given user.
 * @param userId - Application user id (multi-tenant subject)
 */
export function signAccessToken(userId: string): string {
  const env = loadEnv();
  const payload: AccessTokenPayload = { sub: userId, type: "access" };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
    issuer: "codevault-api",
    audience: "codevault",
  });
}

/**
 * Signs a refresh JWT with a unique session id (jti).
 * @param userId - Application user id
 * @param jti - Refresh session identifier stored in Redis
 */
export function signRefreshToken(userId: string, jti: string): string {
  const env = loadEnv();
  const payload: RefreshTokenPayload = { sub: userId, type: "refresh", jti };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
    issuer: "codevault-api",
    audience: "codevault",
  });
}

/**
 * Verifies an access JWT.
 * @param token - JWT string from cookie or header
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const env = loadEnv();
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "codevault-api",
      audience: "codevault",
    }) as AccessTokenPayload;
    if (decoded.type !== "access") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verifies a refresh JWT.
 * @param token - JWT string from httpOnly cookie
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const env = loadEnv();
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: "codevault-api",
      audience: "codevault",
    }) as RefreshTokenPayload;
    if (decoded.type !== "refresh" || !decoded.jti) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/** Cookie options for auth tokens (httpOnly, secure in production). */
export function authCookieOptions(secure: boolean): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
} {
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
  };
}

export const cookieMaxAge = {
  access: ACCESS_MAX_AGE_MS,
  refresh: REFRESH_MAX_AGE_MS,
} as const;
