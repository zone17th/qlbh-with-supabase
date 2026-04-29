import { api, type PageParams, type PageResult } from "./api";
import type {
  InventoryImportOption,
  InventorySummary,
  InventoryTransaction,
} from "../types/models";
import type { InventoryExportForm, InventoryImportForm } from "../types/forms";

export const inventoryService = {
  transactions(params: PageParams & {
    type?: string;
    productId?: number;
    variantName?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    return api.get<PageResult<InventoryTransaction>>("/inventory/transactions", params);
  },
  summary(params: PageParams & {
    productId?: number;
    variantName?: string;
    hasRemainingStock?: boolean;
    hasAvailable?: boolean;
  } = {}) {
    return api.get<PageResult<InventorySummary>>("/inventory/summary", params);
  },
  importStock(form: InventoryImportForm) {
    return api.post<InventoryTransaction[]>("/inventory/imports", form);
  },
  exportStock(form: InventoryExportForm) {
    return api.post<InventoryTransaction[]>("/inventory/exports", form);
  },
  importOptions(productId: number, variantName: string) {
    return api.get<InventoryImportOption[]>("/inventory/import-options", {
      productId,
      variantName,
    });
  },
  deleteTransaction(id: number) {
    return api.delete<null>(`/inventory/transactions/${id}`);
  },
};
