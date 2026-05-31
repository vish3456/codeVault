// apps/api/src/features/auth/auth.errors.ts

/** Auth service error codes (mapped to RFC 7807 in controllers). */
export type AuthErrorCode =
  | "INVALID_FIREBASE_TOKEN"
  | "USER_PROVISION_FAILED"
  | "INVALID_REFRESH_TOKEN"
  | "REFRESH_SESSION_REVOKED"
  | "REFRESH_SESSION_STORE_FAILED";

export interface AuthServiceError {
  code: AuthErrorCode;
  message: string;
}

/**
 * Builds a typed auth service error.
 * @param code - Error code
 * @param message - Human-readable message
 */
export function authError(
  code: AuthErrorCode,
  message: string,
): AuthServiceError {
  return { code, message };
}
