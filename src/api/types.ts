export class ApiError extends Error {
  status: number;
  data: unknown;
  isNetworkError: boolean;
  isAuthError: boolean;
  requestId?: string;

  constructor(
    message: string,
    {
      status = 0,
      data,
      isNetworkError = false,
      requestId,
    }: { status?: number; data?: unknown; isNetworkError?: boolean; requestId?: string } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? 0;
    this.data = data;
    this.isNetworkError = isNetworkError ?? false;
    this.isAuthError = (status ?? 0) === 401 || (status ?? 0) === 403;
    this.requestId = requestId;
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface EntityFilterOptions {
  filter?: Record<string, unknown>;
  sort?: string;
  sort_by?: string;
  limit?: number;
  search?: string;
  q?: string;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
