import { api, type PageParams, type PageResult } from "./api";
import type { Order, OrderStatus, OrderType } from "../types/models";
import type { OrderForm } from "../types/forms";

export const orderService = {
  list(params: PageParams & {
    customerName?: string;
    status?: OrderStatus | "";
    orderType?: OrderType | "";
    productId?: number;
    variantName?: string;
    saleDateFrom?: string;
    saleDateTo?: string;
  } = {}) {
    return api.get<PageResult<Order>>("/orders", params);
  },
  create(form: OrderForm) {
    return api.post<Order>("/orders", form);
  },
  update(form: OrderForm) {
    return api.put<Order>(`/orders/${form.id}`, form);
  },
  updateStatus(id: number, body: Record<string, unknown>) {
    return api.patch<Order>(`/orders/${id}/status`, body);
  },
  delete(id: number) {
    return api.delete<null>(`/orders/${id}`);
  },
  restoreStock(id: number) {
    return api.post<Order>(`/orders/${id}/restore-stock`);
  },
};
