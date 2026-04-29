import { api } from "./api";
import type { SaleRecord } from "../types/models";

export const salesService = {
  list() {
    return api.get<SaleRecord[]>("/sales");
  },
  create(form: Partial<SaleRecord>) {
    return api.post<SaleRecord>("/sales", form);
  },
  update(form: Partial<SaleRecord> & { id: number }) {
    return api.put<SaleRecord>(`/sales/${form.id}`, form);
  },
  delete(id: number) {
    return api.delete<null>(`/sales/${id}`);
  },
};
