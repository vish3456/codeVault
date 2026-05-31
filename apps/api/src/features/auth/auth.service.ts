// apps/api/src/features/auth/auth.service.ts

import { verifyFirebaseIdToken } from "../../lib/firebase.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import { getRedis, redisKeys } from "../../lib/redis.js";
import { err, ok, type Result } from "../../lib/result.js";
import {
  authError,
  type AuthServiceError,
} from "./auth.errors.js";

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/** In-memory refresh sessions when Redis is not configured. */
const memoryRefreshSessions = new Map<string, { userId: string; expiresAt: number }>();

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface FirebaseLoginResult {
  tokens: AuthTokens;
  user: AuthUser;
}

/**
 * Verifies Firebase ID token, provisions user, issues JWT pair.
 * @param idToken - Firebase Auth ID token from client
 */
export async function loginWithFirebase(
  idToken: string,
): Promise<Result<FirebaseLoginResult, AuthServiceError>> {
  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return err(
      authError("INVALID_FIREBASE_TOKEN", "Firebase token verification failed."),
    );
  }

  const firebaseUid = decoded.uid;
  const email =
    typeof decoded.email === "string" ? decoded.email : null;
  const name =
    typeof decoded["name"] === "string" ? decoded["name"] : null;
  const avatarUrl =
    typeof decoded.picture === "string" ? decoded.picture : null;

  let user;
  try {
    user = await prisma.user.upsert({
      where: { firebaseUid },
      create: { firebaseUid, email, name, avatarUrl },
      update: {
        ...(email !== null ? { email } : {}),
        ...(name !== null ? { name } : {}),
        ...(avatarUrl !== null ? { avatarUrl } : {}),
      },
    });
  } catch {
    return err(
      authError("USER_PROVISION_FAILED", "Could not provision user record."),
    );
  }

  const tokensResult = await issueTokenPair(user.id);
  if (!tokensResult.ok) {
    return tokensResult;
  }

  return ok({
    tokens: tokensResult.value,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
}

/**
 * Rotates tokens using a valid refresh JWT and stored session.
 * @param refreshToken - Refresh JWT from httpOnly cookie
 */
export async function refreshSession(
  refreshToken: string,
): Promise<Result<AuthTokens, AuthServiceError>> {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return err(
      authError("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired."),
    );
  }

  const valid = await isRefreshSessionActive(payload.sub, payload.jti);
  if (!valid) {
    return err(
      authError(
        "REFRESH_SESSION_REVOKED",
        "Refresh session is no longer valid.",
      ),
    );
  }

  await revokeRefreshSession(payload.sub, payload.jti);
  return issueTokenPair(payload.sub);
}

/**
 * Revokes refresh session and clears server-side state.
 * @param refreshToken - Optional refresh JWT to revoke specifically
 * @param userId - User id when revoking all sessions for user
 */
export async function logout(
  refreshToken?: string,
  userId?: string,
): Promise<Result<{ revoked: boolean }, AuthServiceError>> {
  if (refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (payload) {
      await revokeRefreshSession(payload.sub, payload.jti);
    }
    return ok({ revoked: true });
  }

  if (userId) {
    await revokeAllRefreshSessionsForUser(userId);
    return ok({ revoked: true });
  }

  return ok({ revoked: false });
}

async function issueTokenPair(
  userId: string,
): Promise<Result<AuthTokens, AuthServiceError>> {
  const jti = crypto.randomUUID();
  const storeResult = await storeRefreshSession(userId, jti);
  if (!storeResult.ok) {
    return storeResult;
  }

  return ok({
    userId,
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId, jti),
  });
}

async function storeRefreshSession(
  userId: string,
  jti: string,
): Promise<Result<void, AuthServiceError>> {
  const redis = getRedis();
  const key = redisKeys.refreshToken(userId, jti);

  if (redis) {
    try {
      await redis.set(key, "1", "EX", REFRESH_TTL_SECONDS);
      return ok(undefined);
    } catch {
      return err(
        authError(
          "REFRESH_SESSION_STORE_FAILED",
          "Could not persist refresh session.",
        ),
      );
    }
  }

  memoryRefreshSessions.set(key, {
    userId,
    expiresAt: Date.now() + REFRESH_TTL_SECONDS * 1000,
  });
  return ok(undefined);
}

async function isRefreshSessionActive(
  userId: string,
  jti: string,
): Promise<boolean> {
  const redis = getRedis();
  const key = redisKeys.refreshToken(userId, jti);

  if (redis) {
    const value = await redis.get(key);
    return value === "1";
  }

  const session = memoryRefreshSessions.get(key);
  if (!session) {
    return false;
  }
  if (session.expiresAt < Date.now()) {
    memoryRefreshSessions.delete(key);
    return false;
  }
  return true;
}

async function revokeRefreshSession(
  userId: string,
  jti: string,
): Promise<void> {
  const redis = getRedis();
  const key = redisKeys.refreshToken(userId, jti);

  if (redis) {
    await redis.del(key);
    return;
  }

  memoryRefreshSessions.delete(key);
}

async function revokeAllRefreshSessionsForUser(userId: string): Promise<void> {
  const redis = getRedis();
  const prefix = `session:refresh:${userId}:`;

  if (redis) {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
    return;
  }

  for (const key of memoryRefreshSessions.keys()) {
    if (key.startsWith(prefix)) {
      memoryRefreshSessions.delete(key);
    }
  }
}
