import type { OrderStatus, OrderType } from "./models";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Mới tạo",
  PACKAGED: "Đã đóng gói",
  SHIPPING: "Đang giao",
  SHIPPED: "Đã giao",
  PAYMENT_PENDING: "Chờ thanh toán",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  ONLINE: "Online",
  IN_STORE: "Tại cửa hàng",
};

export function availableTransitions(orderType: OrderType, status: OrderStatus): OrderStatus[] {
  if (orderType === "ONLINE") {
    if (status === "CREATED") return ["PACKAGED", "CANCELLED"];
    if (status === "PACKAGED") return ["SHIPPING", "CANCELLED"];
    if (status === "SHIPPING") return ["SHIPPED", "CANCELLED"];
    return [];
  }
  if (status === "CREATED") return ["COMPLETED", "CANCELLED"];
  if (status === "PAYMENT_PENDING") return ["COMPLETED", "CANCELLED"];
  return [];
}

export const INVENTORY_TYPE_LABELS = {
  IMPORT: "Nhập",
  EXPORT: "Xuất",
} as const;
