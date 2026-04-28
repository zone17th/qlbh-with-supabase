import type {
  OrderExtraCost,
  OrderItem,
  OrderType,
  ProductVariant,
  ShippingProviderShipper,
} from "./models";

export interface ProductForm {
  id?: number;
  name: string;
  categoryId: number;
  warrantyMonths: number;
  note: string;
  variants: ProductVariant[];
}

export interface CategoryForm {
  id?: number;
  name: string;
  description: string;
}

export interface ShippingProviderForm {
  id?: number;
  providerName: string;
  shippers: ShippingProviderShipper[];
}

export interface InventoryImportForm {
  productId: number;
  importDate: string;
  note: string;
  invoiceFile: string;
  items: Array<{ variantName: string; importPrice: number; quantity: number }>;
}

export interface InventoryExportForm {
  productId: number;
  transactionDate: string;
  note: string;
  items: Array<{ variantName: string; importTransactionId: number; quantity: number }>;
}

export interface OrderForm {
  id?: number;
  orderType: OrderType;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  saleDate: string;
  shippingFee: number;
  discountAmount: number;
  note: string;
  items: OrderItem[];
  extraCosts: OrderExtraCost[];
}
