import { getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase";

/**
 * Base URL of the InsureX backend (e.g. https://api.example.com). When unset, the
 * frontend keeps using its built-in demo data.
 */
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

export const isApiConfigured = rawBaseUrl.length > 0;
export const API_BASE_URL = rawBaseUrl ? `${rawBaseUrl}/api/v1` : "";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Error returned by the backend's `{ success: false, error }` envelope. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type QueryValue = string | number | boolean | undefined | null;

/** The signed-in user's Firebase ID token (refreshed by Firebase when needed). */
async function getIdToken(): Promise<string> {
  if (typeof window === "undefined") {
    throw new ApiError(0, "BROWSER_ONLY", "API requests are only made from the browser.");
  }
  if (!isFirebaseClientConfigured) {
    throw new ApiError(0, "FIREBASE_NOT_CONFIGURED", "Firebase is not configured.");
  }
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  if (!auth.currentUser) {
    throw new ApiError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  }
  return auth.currentUser.getIdToken();
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  }
  return url.toString();
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}

async function send(path: string, options: RequestOptions) {
  if (!isApiConfigured) {
    throw new ApiError(0, "API_NOT_CONFIGURED", "The InsureX API is not configured.");
  }
  const token = await getIdToken();
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the InsureX API.");
  }

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: unknown;
    meta?: PaginationMeta;
    error?: { code?: string; message?: string; requestId?: string };
  } | null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "UNKNOWN_ERROR",
      payload?.error?.message ?? `Request failed (${response.status}).`,
      payload?.error?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    );
  }
  return payload;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await send(path, options)).data as T;
}

export async function apiRequestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Paginated<T>> {
  const payload = await send(path, options);
  return { data: payload.data as T[], meta: payload.meta as PaginationMeta };
}

/** Shared list parameters supported by the backend. */
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  from?: string;
  to?: string;
}
