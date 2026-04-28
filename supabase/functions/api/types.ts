export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = Record<string, JsonValue | undefined>;

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
}

export interface PagedData<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const ORDER_TYPES = ["ONLINE", "IN_STORE"] as const;
export type OrderType = typeof ORDER_TYPES[number];

export const ORDER_STATUSES = [
  "CREATED",
  "PACKAGED",
  "SHIPPING",
  "SHIPPED",
  "PAYMENT_PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const INVENTORY_TRANSACTION_TYPES = ["IMPORT", "EXPORT"] as const;
export type InventoryTransactionType = typeof INVENTORY_TRANSACTION_TYPES[number];

export const INVENTORY_TRANSACTION_SOURCES = [
  "MANUAL",
  "ORDER",
  "ORDER_CANCEL",
] as const;
export type InventoryTransactionSource =
  typeof INVENTORY_TRANSACTION_SOURCES[number];

export interface RouteContext {
  method: string;
  path: string;
  segments: string[];
  query: URLSearchParams;
  request: Request;
}
