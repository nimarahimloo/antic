import { API_BASE, AUTH_EVENT } from "./constants";
import { clearToken, getToken } from "./token";
import { ApiError, RequestOptions } from "./types";

/**
 * Perform a fetch request and normalise the result.
 */
async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const shouldAuth = options.auth ?? true;
  if (shouldAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });
  } catch {
    throw new ApiError("شبکه در دسترس نیست. لطفاً اتصال اینترنت را بررسی کنید.", {
      status: 0,
      data: null,
      isNetworkError: true,
    });
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    let message: string;
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as Record<string, unknown>).error === "string"
    ) {
      message = (data as Record<string, unknown>).error as string;
    } else {
      message = `HTTP ${res.status}`;
    }

    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_EVENT));
      }
    }

    throw new ApiError(message, {
      status: res.status,
      data,
      requestId: (data as Record<string, unknown>)?.requestId as string | undefined,
    });
  }

  return data as T;
}

export { request };
