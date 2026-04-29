import { orderService } from "./orderService";
import { statisticsService } from "./statisticsService";

export const dashboardService = {
  getSummary(fromDate: string, toDate: string) {
    return statisticsService.businessSummary(fromDate, toDate);
  },
  getTopProductSourceOrders(fromDate: string, toDate: string) {
    return orderService.list({
      page: 0,
      size: 200,
      saleDateFrom: fromDate,
      saleDateTo: toDate,
    });
  },
};
