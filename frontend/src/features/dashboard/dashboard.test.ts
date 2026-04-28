import { describe, expect, it } from "vitest";
import type { Order } from "../../types/models";
import { deriveTopProducts } from "./model";

function order(partial: Partial<Order>): Order {
  return {
    id: 1,
    orderCode: "ORD-1",
    customerName: "Khách",
    orderDate: "2026-04-28",
    saleDate: "2026-04-28",
    status: "SHIPPED",
    orderType: "ONLINE",
    subTotal: 0,
    discountAmount: 0,
    extraCostTotal: 0,
    shippingFee: 0,
    totalAmount: 0,
    estimatedCostTotal: 0,
    projectedProfit: 0,
    items: [],
    extraCosts: [],
    shippingHistory: [],
    ...partial,
  };
}

describe("deriveTopProducts", () => {
  it("aggregates non-cancelled order item revenue and ignores cancelled orders", () => {
    const result = deriveTopProducts([
      order({
        status: "SHIPPED",
        items: [
          {
            productId: 10,
            productName: "Máy in",
            variantName: "Đen",
            quantity: 1,
            unitSalePrice: 100000,
            discountAmount: 0,
            lineTotal: 100000,
          },
          {
            productId: 10,
            productName: "Máy in",
            variantName: "Đen",
            quantity: 1,
            unitSalePrice: 50000,
            discountAmount: 0,
            lineTotal: 50000,
          },
        ],
      }),
      order({
        status: "CANCELLED",
        items: [
          {
            productId: 11,
            productName: "Bàn phím",
            variantName: "Blue switch",
            quantity: 1,
            unitSalePrice: 900000,
            discountAmount: 0,
            lineTotal: 900000,
          },
        ],
      }),
    ]);

    expect(result).toEqual([{ name: "Máy in - Đen", revenue: 150000 }]);
  });
});
