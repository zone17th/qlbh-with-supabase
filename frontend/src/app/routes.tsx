import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { CatalogPage } from "../pages/CatalogPage";
import { InventoryPage } from "../pages/InventoryPage";
import { OrdersPage } from "../pages/OrdersPage";
import { ShippingProvidersPage } from "../pages/ShippingProvidersPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";

export function AppRoutes() {
  const location = useLocation();

  return (
    <AppLayout activePath={location.pathname}>
      <Routes>
        <Route element={<Navigate replace to="/dashboard" />} path="/" />
        <Route element={<DashboardPage />} path="/dashboard" />
        <Route element={<CatalogPage />} path="/sales" />
        <Route element={<InventoryPage />} path="/inventory" />
        <Route element={<OrdersPage />} path="/orders" />
        <Route element={<ShippingProvidersPage />} path="/shipping-providers" />
        <Route element={<Navigate replace to="/dashboard" />} path="*" />
      </Routes>
    </AppLayout>
  );
}
