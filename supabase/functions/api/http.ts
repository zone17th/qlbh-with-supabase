import type { ApiResponse, PagedData } from "./types.ts";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

export function ok<T>(data: T, message = "OK", status = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return json(body, status);
}

export function created<T>(data: T, message = "Created"): Response {
  return ok(data, message, 201);
}

export function emptyOk(message = "OK"): Response {
  return ok<null>(null, message);
}

export function fail(message: string, status = 500): Response {
  const body: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  };
  return json(body, status);
}

export function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function badRequest(message: string): never {
  throw new HttpError(400, message);
}

export function notFound(message: string): never {
  throw new HttpError(404, message);
}

export function unexpected(message: string): never {
  throw new HttpError(500, message);
}

export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request,
): Promise<T | null> {
  const text = await request.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as T;
}

export function paged<T>(
  items: T[],
  page: number,
  size: number,
  totalElements: number,
): PagedData<T> {
  return {
    items,
    page,
    size,
    totalElements,
    totalPages: size > 0 ? Math.ceil(totalElements / size) : 0,
  };
}

export function normalizeInMemoryPage(page: number, size: number) {
  return {
    page: Math.max(page, 0),
    size: Math.max(size, 1),
  };
}

export function pageParam(query: URLSearchParams): number {
  return Number.parseInt(query.get("page") ?? "0", 10);
}

export function sizeParam(query: URLSearchParams): number {
  return Number.parseInt(query.get("size") ?? "20", 10);
}

export function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizePath(pathname: string): string {
  const apiIndex = pathname.indexOf("/api/v1");
  if (apiIndex >= 0) return pathname.slice(apiIndex);
  if (pathname.endsWith("/health")) return "/health";
  return pathname;
}

export function parsePositiveId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function includesIgnoreCase(
  value: unknown,
  keyword: string,
): boolean {
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes(keyword.toLowerCase());
}

export function equalsIgnoreCase(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  return String(a).toLowerCase() === String(b).toLowerCase();
}
