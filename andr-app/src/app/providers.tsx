import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { HashRouter } from "react-router-dom";
import { queryClient } from "../shared/api/query";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>{children}</HashRouter>
    </QueryClientProvider>
  );
}
