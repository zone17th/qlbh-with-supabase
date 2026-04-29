import type { Order, TopProduct } from "../types/models";

/**
 * Calculates top products based on revenue from a list of orders.
 */
export function deriveTopProducts(orders: Order[], limit = 5): TopProduct[] {
  const totals = new Map<string, number>();

  for (const order of orders) {
    if (order.status === "CANCELLED") continue;
    for (const item of order.items) {
      const name = `${item.productName ?? item.productId} - ${item.variantName}`;
      totals.set(name, (totals.get(name) ?? 0) + (item.lineTotal ?? 0));
    }
  }

  return [...totals.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
