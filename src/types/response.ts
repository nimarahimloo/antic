/**
 * Generic API response types for consistent response shapes across the frontend.
 */

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

export interface PaginatedApiResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  requestId: string;
  details?: Record<string, unknown>;
}
