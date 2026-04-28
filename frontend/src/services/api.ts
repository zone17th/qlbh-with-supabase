import type { ApiResponse, PagedData } from "../types/models";
import { toQuery } from "../utils/format";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? `HTTP ${response.status}`);
  }
  return payload.data;
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
    return request<T>(`${path}${params ? toQuery(params) : ""}`);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },
};

export type PageParams = {
  page?: number;
  size?: number;
  keyword?: string;
};

export type PageResult<T> = PagedData<T>;
