import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";
import { deriveTopProducts } from "../utils/dashboard";

export function useDashboardSummary(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["dashboard", "summary", fromDate, toDate],
    queryFn: async () => {
      const [summary, orders] = await Promise.all([
        dashboardService.getSummary(fromDate, toDate),
        dashboardService.getTopProductSourceOrders(fromDate, toDate),
      ]);

      return {
        summary,
        topProducts: deriveTopProducts(orders.items),
      };
    },
  });
}
