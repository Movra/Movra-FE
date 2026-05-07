export type ErrorResponse = {
  httpStatus: string;
  statusCode: number;
  message: string;
  timestamp: string;
};

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  token?: string;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
};
