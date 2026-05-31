// apps/api/src/lib/result.ts

/** Successful outcome with a value. */
export type Ok<T> = { readonly ok: true; readonly value: T };

/** Failed outcome with an error payload. */
export type Err<E> = { readonly ok: false; readonly error: E };

/** Discriminated union for service-layer outcomes (no throws). */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Wraps a successful value in a Result.
 * @param value - Outcome value
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Wraps an error in a Result.
 * @param error - Error payload
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Maps a successful Result value; errors pass through unchanged.
 * @param result - Source Result
 * @param fn - Transform for success values
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (!result.ok) {
    return result;
  }
  return ok(fn(result.value));
}
