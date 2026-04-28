import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./api";
import { deriveTopProducts } from "./model";

export function useDashboardSummary(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["dashboard", "summary", fromDate, toDate],
    queryFn: async () => {
      const [summary, orders] = await Promise.all([
        dashboardApi.summary(fromDate, toDate),
        dashboardApi.topProductSourceOrders(fromDate, toDate),
      ]);

      return {
        summary,
        topProducts: deriveTopProducts(orders.items),
      };
    },
  });
}
