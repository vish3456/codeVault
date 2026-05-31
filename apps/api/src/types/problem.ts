// apps/api/src/types/problem.ts

/** RFC 7807 Problem Details for HTTP APIs. */
export interface ProblemDetails {
  /** URI reference identifying the problem type. */
  type: string;
  /** Short human-readable summary. */
  title: string;
  /** HTTP status code. */
  status: number;
  /** Human-readable explanation specific to this occurrence. */
  detail?: string;
  /** URI identifying this specific occurrence. */
  instance?: string;
  /** Extension members (e.g. validation errors). */
  [key: string]: unknown;
}

/**
 * Builds an RFC 7807 problem object.
 * @param params - Problem fields
 */
export function createProblem(params: {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  extensions?: Record<string, unknown>;
}): ProblemDetails {
  const { extensions, ...base } = params;
  return {
    ...base,
    ...(extensions ?? {}),
  };
}
