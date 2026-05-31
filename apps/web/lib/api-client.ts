import { getEnv } from "@/lib/env";
import { getFirebaseAuth } from "@/lib/firebase";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiClientOptions = RequestInit & {
  /** Firebase ID token for authenticated routes */
  token?: string | null;
  /** Internal flag to avoid infinite retry loops */
  isRetry?: boolean;
};

function buildUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  return `${base}/api/v1${normalized}`;
}

// Track whether a refresh is in progress to avoid duplicate refresh calls
let isRefreshing = false;
let refreshPromise: Promise<unknown> | null = null;

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { token, isRetry = false, headers: initHeaders, ...init } = options;

  const headers = new Headers(initHeaders);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestOptions: RequestInit = {
    ...init,
    headers,
    credentials: "include",
  };

  const response = await fetch(buildUrl(path), requestOptions);

  if (response.status === 401 && !isRetry && path !== "/auth/firebase" && path !== "/auth/refresh") {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = apiClient("/auth/refresh", { method: "POST", isRetry: true })
        .then(() => {
          isRefreshing = false;
          refreshPromise = null;
        })
        .catch(async (err) => {
          isRefreshing = false;
          refreshPromise = null;
          // Refresh failed, sign out from Firebase
          try {
            const auth = getFirebaseAuth();
            if (auth.currentUser) {
              await auth.signOut();
            }
          } catch (signOutErr) {
            console.error("Sign out after refresh failure failed:", signOutErr);
          }
          throw err;
        });
    }

    try {
      await refreshPromise;
      return await apiClient<T>(path, { ...options, isRetry: true });
    } catch (refreshErr) {
      throw new ApiError(
        "Unauthorized and token refresh failed",
        401,
        refreshErr,
      );
    }
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      try {
        body = await response.text();
      } catch {
        body = undefined;
      }
    }
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
