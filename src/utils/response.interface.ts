export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  details?: unknown;
  data: T | null;
}

export interface PaginatedData<T> {
  items: T[];
  totalCount: number;
}

export type GetListResponse<T> = ApiResponse<PaginatedData<T>>;
