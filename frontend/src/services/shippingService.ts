import { api, type PageParams, type PageResult } from "./api";
import type { ShippingProvider } from "../types/models";
import type { ShippingProviderForm } from "../types/forms";

export const shippingService = {
  list(params: PageParams = {}) {
    return api.get<PageResult<ShippingProvider>>("/shipping-providers", params);
  },
  create(form: ShippingProviderForm) {
    return api.post<ShippingProvider>("/shipping-providers", form);
  },
  update(form: ShippingProviderForm) {
    return api.put<ShippingProvider>(`/shipping-providers/${form.id}`, form);
  },
  delete(id: number) {
    return api.delete<null>(`/shipping-providers/${id}`);
  },
};
