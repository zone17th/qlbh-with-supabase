import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { queryClient } from "../shared/api/query";

// Giả sử chúng ta dùng window.location.protocol để nhận biết môi trường Capacitor
const isNative = window.location.protocol === 'file:';
const Router = isNative ? HashRouter : BrowserRouter;

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>{children}</Router>
    </QueryClientProvider>
  );
}
