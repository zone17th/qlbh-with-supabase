import {
  BarChart3,
  Boxes,
  type LucideIcon,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { ComponentType } from "react";
import { DashboardPage } from "../pages/DashboardPage";
import { CatalogPage } from "../pages/CatalogPage";
import { InventoryPage } from "../pages/InventoryPage";
import { OrdersPage } from "../pages/OrdersPage";
import { ShippingProvidersPage } from "../pages/ShippingProvidersPage";
import { LegacySalesPage } from "../pages/LegacySalesPage";

export interface AppRoute {
  path: string;
  label: string;
  icon: LucideIcon;
  element: ComponentType;
}

export const routes: AppRoute[] = [
  { path: "/dashboard", label: "Dashboard", icon: BarChart3, element: DashboardPage },
  { path: "/sales", label: "Sản phẩm", icon: PackageSearch, element: CatalogPage },
  { path: "/inventory", label: "Kho", icon: Boxes, element: InventoryPage },
  { path: "/orders", label: "Đơn hàng", icon: ShoppingCart, element: OrdersPage },
  { path: "/shipping-providers", label: "Giao hàng", icon: Truck, element: ShippingProvidersPage },
  { path: "/legacy-sales", label: "Legacy sales", icon: ReceiptText, element: LegacySalesPage },
];
