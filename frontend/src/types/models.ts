export type OrderType = "ONLINE" | "IN_STORE";

export type OrderStatus =
  | "CREATED"
  | "PACKAGED"
  | "SHIPPING"
  | "SHIPPED"
  | "PAYMENT_PENDING"
  | "COMPLETED"
  | "CANCELLED";

export type InventoryTransactionType = "IMPORT" | "EXPORT";
export type InventoryTransactionSource = "MANUAL" | "ORDER" | "ORDER_CANCEL" | null;

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PagedData<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string | null;
}

export interface ProductVariant {
  id?: number | null;
  variantName: string;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  categoryName?: string | null;
  warrantyMonths: number;
  note?: string | null;
  variants: ProductVariant[];
}

export interface InventoryTransaction {
  id: number;
  productId: number | null;
  productName: string;
  variantName: string | null;
  importPrice: number | null;
  quantity: number;
  type: InventoryTransactionType;
  source: InventoryTransactionSource;
  sourceId: number | null;
  batchCode: string | null;
  invoiceFile: string | null;
  importTransactionId: number | null;
  transactionDate: string;
  note: string | null;
}

export interface InventorySummary {
  productId: number | null;
  productName: string;
  variantName: string | null;
  totalImported: number;
  totalExported: number;
  currentStock: number;
  averageImportPrice: number;
  pendingOrderQuantity: number;
  shippedOrderQuantity: number;
  availableAfterPending: number;
}

export interface InventoryImportOption {
  id: number;
  productId: number;
  productName: string;
  variantName: string;
  importPrice: number;
  quantity: number;
  sellableQuantity: number;
  transactionDate: string;
  batchCode: string | null;
}

export interface ShippingProviderShipper {
  id?: number;
  shipperName: string;
  shipperPhone: string;
}

export interface ShippingProvider {
  id: number;
  providerName: string;
  shippers: ShippingProviderShipper[];
}

export interface OrderItem {
  id?: number;
  productId: number;
  productName?: string;
  variantName: string;
  importTransactionId?: number | null;
  importTransactionDate?: string | null;
  importUnitPrice?: number | null;
  quantity: number;
  sellableQuantity?: number;
  unitSalePrice: number;
  discountAmount: number;
  warrantyMonths?: number | null;
  lineTotal?: number;
}

export interface OrderExtraCost {
  id?: number;
  costName: string;
  amount: number;
}

export interface OrderHistory {
  id: number;
  status: OrderStatus;
  changedAt: string;
  note: string | null;
}

export interface Order {
  id: number;
  orderCode: string;
  customerName: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  orderDate: string;
  saleDate: string;
  status: OrderStatus;
  orderType: OrderType;
  note?: string | null;
  subTotal: number;
  discountAmount: number;
  extraCostTotal: number;
  shippingFee: number;
  totalAmount: number;
  estimatedCostTotal: number;
  projectedProfit: number;
  shippingProviderId?: number | null;
  shippingProviderName?: string | null;
  shipperName?: string | null;
  shipperPhone?: string | null;
  actualShippingFee?: number | null;
  additionalCost?: number | null;
  actualProfit?: number | null;
  items: OrderItem[];
  extraCosts: OrderExtraCost[];
  shippingHistory: OrderHistory[];
}

export interface BusinessSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
  paymentPendingOrders: number;
  pendingShippingOrders: number;
  dailyStatistics: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    orderCount: number;
    shippedOrders: number;
    importedQuantity: number;
    exportedQuantity: number;
  }>;
  categoryRevenues: Array<{ categoryName: string; revenue: number }>;
}

export interface SaleRecord {
  id: number;
  productName?: string | null;
  importDate?: string | null;
  importPrice?: number | null;
  salePrice?: number | null;
  shippingFee?: number | null;
  saleDate?: string | null;
  note?: string | null;
  estimatedRevenue: number;
}
