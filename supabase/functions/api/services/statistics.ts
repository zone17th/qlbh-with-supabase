import { db, unwrap } from "../db.ts";
import { badRequest, isIsoDate } from "../http.ts";
import {
  money,
  moneyTimesQtyToMoney,
  nvlMoney,
  qty,
  toNumberMoney,
  toNumberQty,
} from "../money.ts";

function dateRange(fromDate: string, toDate: string) {
  const dates: string[] = [];
  const current = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export async function businessSummary(query: URLSearchParams) {
  const fromDate = query.get("fromDate");
  const toDate = query.get("toDate");
  if (!isIsoDate(fromDate) || !isIsoDate(toDate)) {
    badRequest("fromDate và toDate là bắt buộc");
  }

  const orders = await unwrap<any[]>(
    db
      .from("sales_orders")
      .select("*, items:sales_order_items(product_id,product_name,variant_name,quantity,line_total)")
      .gte("sale_date", fromDate)
      .lte("sale_date", toDate),
  );
  const transactions = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("*")
      .gte("transaction_date", fromDate)
      .lte("transaction_date", toDate),
  );
  const products = await unwrap<any[]>(
    db.from("products").select("id, category:product_categories(id,name)"),
  );
  const categoryByProduct = new Map(
    products.map((product) => [
      Number(product.id),
      product.category?.name ?? "Chưa phân loại",
    ]),
  );

  const nonCancelled = orders.filter((order) => order.status !== "CANCELLED");
  const finalized = orders.filter((order) =>
    order.status === "SHIPPED" || order.status === "COMPLETED"
  );
  const totalRevenue = finalized.reduce(
    (sum, order) => sum + money(order.total_amount),
    0n,
  );
  const totalProfit = finalized.reduce(
    (sum, order) => sum + money(order.actual_profit ?? order.projected_profit),
    0n,
  );
  const totalCost = transactions.reduce((sum, tx) => {
    if (tx.transaction_type !== "IMPORT" || tx.source === "ORDER_CANCEL") return sum;
    return sum + moneyTimesQtyToMoney(nvlMoney(tx.import_price), qty(tx.quantity));
  }, 0n);

  const categoryRevenue = new Map<string, bigint>();
  for (const order of finalized) {
    for (const item of order.items ?? []) {
      const categoryName = categoryByProduct.get(Number(item.product_id)) ??
        "Chưa phân loại";
      categoryRevenue.set(
        categoryName,
        (categoryRevenue.get(categoryName) ?? 0n) + money(item.line_total),
      );
    }
  }

  const dailyStatistics = dateRange(fromDate, toDate).map((date) => {
    const dayOrders = orders.filter((order) => order.sale_date === date);
    const dayFinalized = dayOrders.filter((order) =>
      order.status === "SHIPPED" || order.status === "COMPLETED"
    );
    const dayTransactions = transactions.filter((tx) => tx.transaction_date === date);
    const revenue = dayFinalized.reduce(
      (sum, order) => sum + money(order.total_amount),
      0n,
    );
    const profit = dayFinalized.reduce(
      (sum, order) => sum + money(order.actual_profit ?? order.projected_profit),
      0n,
    );
    const cost = dayTransactions.reduce((sum, tx) => {
      if (tx.transaction_type !== "IMPORT" || tx.source === "ORDER_CANCEL") return sum;
      return sum + moneyTimesQtyToMoney(nvlMoney(tx.import_price), qty(tx.quantity));
    }, 0n);
    const importedQuantity = dayTransactions.reduce(
      (sum, tx) => tx.transaction_type === "IMPORT" ? sum + qty(tx.quantity) : sum,
      0n,
    );
    const exportedQuantity = dayTransactions.reduce(
      (sum, tx) => tx.transaction_type === "EXPORT" ? sum + qty(tx.quantity) : sum,
      0n,
    );
    return {
      date,
      revenue: toNumberMoney(revenue),
      cost: toNumberMoney(cost),
      profit: toNumberMoney(profit),
      orderCount: dayOrders.filter((order) => order.status !== "CANCELLED").length,
      shippedOrders: dayFinalized.length,
      importedQuantity: toNumberQty(importedQuantity),
      exportedQuantity: toNumberQty(exportedQuantity),
    };
  });

  return {
    totalRevenue: toNumberMoney(totalRevenue),
    totalCost: toNumberMoney(totalCost),
    totalProfit: toNumberMoney(totalProfit),
    totalOrders: nonCancelled.length,
    shippedOrders: finalized.length,
    cancelledOrders: orders.filter((order) => order.status === "CANCELLED").length,
    paymentPendingOrders: nonCancelled.filter((order) => order.status === "PAYMENT_PENDING").length,
    pendingShippingOrders: nonCancelled.filter((order) =>
      order.status === "PACKAGED" || order.status === "SHIPPING"
    ).length,
    dailyStatistics,
    categoryRevenues: [...categoryRevenue.entries()]
      .map(([categoryName, revenue]) => ({
        categoryName,
        revenue: toNumberMoney(revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
