// packages/shared/src/result.ts

/** Successful outcome carrying a value. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failed outcome carrying an error. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Discriminated union for typed success/failure without throwing. */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Wraps a value in a successful `Result`.
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Wraps an error in a failed `Result`.
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type guard that narrows a `Result` to its success branch.
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/**
 * Type guard that narrows a `Result` to its failure branch.
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Unwraps a successful `Result` or throws if the result is an error.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isErr(result)) {
    throw result.error instanceof Error
      ? result.error
      : new Error(String(result.error));
  }
  return result.value;
}

/**
 * Maps the success value of a `Result`, preserving errors unchanged.
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (isErr(result)) {
    return result;
  }
  return ok(fn(result.value));
}

/**
 * Executes an async function and captures thrown errors as a `Result`.
 */
export async function tryCatch<T, E = Error>(
  fn: () => Promise<T>,
  mapError: (unknown: unknown) => E = (e) => e as E,
): Promise<Result<T, E>> {
  try {
    return ok(await fn());
  } catch (unknown) {
    return err(mapError(unknown));
  }
}
