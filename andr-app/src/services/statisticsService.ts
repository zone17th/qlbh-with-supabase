import { api } from "./api";
import type { BusinessSummary } from "../types/models";

export const statisticsService = {
  businessSummary(fromDate: string, toDate: string) {
    return api.get<BusinessSummary>("/statistics/business-summary", {
      fromDate,
      toDate,
    });
  },
};
