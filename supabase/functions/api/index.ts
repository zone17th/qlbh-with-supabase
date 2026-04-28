import {
  corsHeaders,
  created,
  emptyOk,
  fail,
  HttpError,
  normalizePath,
  ok,
  parseJsonBody,
  parsePositiveId,
} from "./http.ts";
import type { RouteContext } from "./types.ts";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getProduct,
  listCategories,
  listProducts,
  updateCategory,
  updateProduct,
} from "./services/catalog.ts";
import {
  deleteTransaction,
  exportStock,
  getImportOptions,
  getInventorySummary,
  importStock,
  listTransactions,
} from "./services/inventory.ts";
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  restoreOrderStock,
  updateOrder,
  updateOrderStatus,
} from "./services/orders.ts";
import {
  createShippingProvider,
  deleteShippingProvider,
  getShippingProvider,
  listShippingProviders,
  updateShippingProvider,
} from "./services/shipping.ts";
import { businessSummary } from "./services/statistics.ts";
import {
  createSaleRecord,
  deleteSaleRecord,
  listSaleRecords,
  updateSaleRecord,
} from "./services/sales.ts";

async function route(ctx: RouteContext): Promise<Response> {
  if (ctx.path === "/health" && ctx.method === "GET") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const resource = ctx.segments[2];
  const id = parsePositiveId(ctx.segments[3]);
  const action = ctx.segments[4];

  if (resource === "product-categories") {
    if (!id && ctx.method === "GET") return ok(await listCategories(ctx.query));
    if (!id && ctx.method === "POST") {
      return created(await createCategory(await parseJsonBody(ctx.request)));
    }
    if (id && ctx.method === "PUT") {
      return ok(await updateCategory(id, await parseJsonBody(ctx.request)));
    }
    if (id && ctx.method === "DELETE") return await deleteCategory(id);
  }

  if (resource === "products") {
    if (!id && ctx.method === "GET") return ok(await listProducts(ctx.query));
    if (!id && ctx.method === "POST") {
      return created(await createProduct(await parseJsonBody(ctx.request)));
    }
    if (id && !action && ctx.method === "GET") return ok(await getProduct(id));
    if (id && !action && ctx.method === "PUT") {
      return ok(await updateProduct(id, await parseJsonBody(ctx.request)));
    }
    if (id && !action && ctx.method === "DELETE") return await deleteProduct(id);
  }

  if (resource === "inventory") {
    const inventoryAction = ctx.segments[3];
    const inventoryId = parsePositiveId(ctx.segments[4]);
    if (inventoryAction === "transactions" && ctx.method === "GET") {
      return ok(await listTransactions(ctx.query));
    }
    if (inventoryAction === "transactions" && inventoryId && ctx.method === "DELETE") {
      return await deleteTransaction(inventoryId);
    }
    if (inventoryAction === "summary" && ctx.method === "GET") {
      return ok(await getInventorySummary(ctx.query));
    }
    if (inventoryAction === "imports" && ctx.method === "POST") {
      return created(await importStock(await parseJsonBody(ctx.request)));
    }
    if (inventoryAction === "exports" && ctx.method === "POST") {
      return created(await exportStock(await parseJsonBody(ctx.request)));
    }
    if (inventoryAction === "import-options" && ctx.method === "GET") {
      return ok(await getImportOptions(ctx.query));
    }
  }

  if (resource === "orders") {
    if (!id && ctx.method === "GET") return ok(await listOrders(ctx.query));
    if (!id && ctx.method === "POST") {
      return created(await createOrder(await parseJsonBody(ctx.request)));
    }
    if (id && !action && ctx.method === "GET") return ok(await getOrder(id));
    if (id && !action && ctx.method === "PUT") {
      return ok(await updateOrder(id, await parseJsonBody(ctx.request)));
    }
    if (id && !action && ctx.method === "DELETE") return await deleteOrder(id);
    if (id && action === "status" && ctx.method === "PATCH") {
      return ok(await updateOrderStatus(id, await parseJsonBody(ctx.request)));
    }
    if (id && action === "restore-stock" && ctx.method === "POST") {
      return ok(await restoreOrderStock(id));
    }
  }

  if (resource === "shipping-providers") {
    if (!id && ctx.method === "GET") return ok(await listShippingProviders(ctx.query));
    if (!id && ctx.method === "POST") {
      return created(await createShippingProvider(await parseJsonBody(ctx.request)));
    }
    if (id && !action && ctx.method === "GET") return ok(await getShippingProvider(id));
    if (id && !action && ctx.method === "PUT") {
      return ok(await updateShippingProvider(id, await parseJsonBody(ctx.request)));
    }
    if (id && !action && ctx.method === "DELETE") {
      return await deleteShippingProvider(id);
    }
  }

  if (resource === "statistics") {
    if (ctx.segments[3] === "business-summary" && ctx.method === "GET") {
      return ok(await businessSummary(ctx.query));
    }
  }

  if (resource === "sales") {
    if (!id && ctx.method === "GET") return ok(await listSaleRecords());
    if (!id && ctx.method === "POST") {
      return created(await createSaleRecord(await parseJsonBody(ctx.request)));
    }
    if (id && ctx.method === "PUT") {
      return ok(await updateSaleRecord(id, await parseJsonBody(ctx.request)));
    }
    if (id && ctx.method === "DELETE") return await deleteSaleRecord(id);
  }

  return fail("Not Found", 404);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const ctx: RouteContext = {
      method: request.method.toUpperCase(),
      path,
      segments: path.split("/").filter(Boolean),
      query: url.searchParams,
      request,
    };
    return await route(ctx);
  } catch (error) {
    if (error instanceof HttpError) return fail(error.message, error.status);
    const message = error instanceof Error ? error.message : String(error);
    return fail(`Unexpected error: ${message}`, 500);
  }
});
