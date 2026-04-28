import { orderService } from "../../services/orderService";
import { statisticsService } from "../../services/statisticsService";

export const dashboardApi = {
  summary(fromDate: string, toDate: string) {
    return statisticsService.businessSummary(fromDate, toDate);
  },
  topProductSourceOrders(fromDate: string, toDate: string) {
    return orderService.list({
      page: 0,
      size: 200,
      saleDateFrom: fromDate,
      saleDateTo: toDate,
    });
  },
};
