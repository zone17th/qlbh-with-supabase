import { db, maybeOne, unwrap } from "../db.ts";
import {
  badRequest,
  emptyOk,
  equalsIgnoreCase,
  includesIgnoreCase,
  isBlank,
  isIsoDate,
  normalizeInMemoryPage,
  notFound,
  paged,
  pageParam,
  sizeParam,
  todayIsoDate,
  trimOrNull,
} from "../http.ts";
import {
  averageMoney,
  money,
  moneyTimesQtyToMoney,
  nvlMoney,
  nvlQty,
  qty,
  toDbMoney,
  toDbQty,
  toNumberMoney,
  toNumberQty,
} from "../money.ts";

export function inventoryTransactionDto(row: any) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    variantName: row.variant_name,
    importPrice: row.import_price === null || row.import_price === undefined
      ? null
      : toNumberMoney(money(row.import_price)),
    quantity: toNumberQty(qty(row.quantity)),
    type: row.transaction_type,
    source: row.source,
    sourceId: row.source_id,
    batchCode: row.batch_code,
    invoiceFile: row.invoice_file,
    importTransactionId: row.import_transaction_id,
    transactionDate: row.transaction_date,
    note: row.note,
  };
}

function inventorySummaryDto(summary: any) {
  return {
    productId: summary.productId,
    productName: summary.productName,
    variantName: summary.variantName,
    totalImported: toNumberQty(summary.totalImported),
    totalExported: toNumberQty(summary.totalExported),
    currentStock: toNumberQty(summary.currentStock),
    averageImportPrice: toNumberMoney(summary.averageImportPrice),
    pendingOrderQuantity: toNumberQty(summary.pendingOrderQuantity),
    shippedOrderQuantity: toNumberQty(summary.shippedOrderQuantity),
    availableAfterPending: toNumberQty(summary.availableAfterPending),
  };
}

async function loadProduct(productId: number) {
  return await maybeOne<any>(
    db
      .from("products")
      .select("*, variants:product_variants(*)")
      .eq("id", productId)
      .single(),
  );
}

function requirePositiveQuantity(value: unknown) {
  const parsed = qty(value);
  if (parsed <= 0n) badRequest("Số lượng phải > 0");
  return parsed;
}

async function fetchAllTransactions() {
  return await unwrap<any[]>(
    db.from("inventory_transactions").select("*").order("id", {
      ascending: false,
    }),
  );
}

export async function listTransactions(query: URLSearchParams) {
  const normalized = normalizeInMemoryPage(pageParam(query), sizeParam(query));
  const keyword = trimOrNull(query.get("keyword"));
  const rawType = trimOrNull(query.get("type"));
  const type = rawType === "IMPORT" || rawType === "EXPORT" ? rawType : null;
  const productId = Number(query.get("productId") ?? "0");
  const variantName = trimOrNull(query.get("variantName"));
  const dateFrom = isIsoDate(query.get("dateFrom")) ? query.get("dateFrom") : null;
  const dateTo = isIsoDate(query.get("dateTo")) ? query.get("dateTo") : null;
  const rows = await fetchAllTransactions();

  const filtered = rows.filter((row) => {
    if (keyword) {
      const matched = includesIgnoreCase(row.product_name, keyword) ||
        includesIgnoreCase(row.variant_name, keyword) ||
        includesIgnoreCase(row.note, keyword) ||
        includesIgnoreCase(row.invoice_file, keyword);
      if (!matched) return false;
    }
    if (type && row.transaction_type !== type) return false;
    if (Number.isFinite(productId) && productId > 0) {
      if (Number(row.product_id) !== productId) return false;
    }
    if (variantName && !equalsIgnoreCase(row.variant_name, variantName)) {
      return false;
    }
    if (dateFrom && row.transaction_date < dateFrom) return false;
    if (dateTo && row.transaction_date > dateTo) return false;
    return true;
  });

  const from = normalized.page * normalized.size;
  return paged(
    filtered.slice(from, from + normalized.size).map(inventoryTransactionDto),
    normalized.page,
    normalized.size,
    filtered.length,
  );
}

function transactionKey(row: any) {
  return `${row.product_id ?? "legacy:" + row.product_name}|${
    String(row.variant_name ?? "").toLowerCase()
  }`;
}

async function pendingQuantitiesByKey() {
  const orders = await unwrap<any[]>(
    db
      .from("sales_orders")
      .select("id,status,items:sales_order_items(product_id,variant_name,quantity)")
      .in("status", ["CREATED", "PACKAGED", "SHIPPING"]),
  );
  const result = new Map<string, bigint>();
  for (const order of orders) {
    if (["SHIPPED", "CANCELLED", "COMPLETED", "PAYMENT_PENDING"].includes(order.status)) {
      continue;
    }
    for (const item of order.items ?? []) {
      const key = `${item.product_id}|${String(item.variant_name ?? "").toLowerCase()}`;
      result.set(key, (result.get(key) ?? 0n) + qty(item.quantity));
    }
  }
  return result;
}

export async function getInventorySummary(query: URLSearchParams) {
  const normalized = normalizeInMemoryPage(pageParam(query), sizeParam(query));
  const keyword = trimOrNull(query.get("keyword"));
  const productId = Number(query.get("productId") ?? "0");
  const variantName = trimOrNull(query.get("variantName"));
  const hasRemainingStock = query.get("hasRemainingStock") === "true";
  const hasAvailable = query.get("hasAvailable") === "true";

  const rows = await fetchAllTransactions();
  const pending = await pendingQuantitiesByKey();
  const summaries = new Map<string, any>();

  for (const row of rows) {
    const key = transactionKey(row);
    const current = summaries.get(key) ?? {
      productId: row.product_id,
      productName: row.product_name,
      variantName: row.variant_name,
      totalImported: 0n,
      totalExported: 0n,
      totalImportAmount: 0n,
      shippedOrderQuantity: 0n,
    };
    const quantity = qty(row.quantity);
    if (row.transaction_type === "IMPORT") {
      current.totalImported += quantity;
      current.totalImportAmount += moneyTimesQtyToMoney(nvlMoney(row.import_price), quantity);
    } else {
      current.totalExported += quantity;
      if (row.source === "ORDER") current.shippedOrderQuantity += quantity;
    }
    summaries.set(key, current);
  }

  let data = [...summaries.values()].map((summary) => {
    const key = `${summary.productId}|${String(summary.variantName ?? "").toLowerCase()}`;
    const pendingOrderQuantity = pending.get(key) ?? 0n;
    const currentStock = summary.totalImported - summary.totalExported;
    return {
      ...summary,
      currentStock,
      pendingOrderQuantity,
      availableAfterPending: currentStock - pendingOrderQuantity,
      averageImportPrice: averageMoney(summary.totalImportAmount, summary.totalImported),
    };
  });

  data = data.filter((summary) => {
    if (keyword) {
      const matched = includesIgnoreCase(summary.productName, keyword) ||
        includesIgnoreCase(summary.variantName, keyword);
      if (!matched) return false;
    }
    if (Number.isFinite(productId) && productId > 0 && Number(summary.productId) !== productId) {
      return false;
    }
    if (variantName && !equalsIgnoreCase(summary.variantName, variantName)) return false;
    if (hasRemainingStock && summary.currentStock <= 0n) return false;
    if (hasAvailable && summary.availableAfterPending <= 0n) return false;
    return true;
  });

  data.sort((a, b) => {
    const byProduct = String(a.productName ?? "").localeCompare(String(b.productName ?? ""), "vi", {
      sensitivity: "base",
    });
    if (byProduct !== 0) return byProduct;
    return String(a.variantName ?? "").localeCompare(String(b.variantName ?? ""), "vi", {
      sensitivity: "base",
    });
  });

  const from = normalized.page * normalized.size;
  return paged(
    data.slice(from, from + normalized.size).map(inventorySummaryDto),
    normalized.page,
    normalized.size,
    data.length,
  );
}

export async function importStock(body: any) {
  if (!body) badRequest("Thiếu dữ liệu request");
  if (body.productId === null || body.productId === undefined) {
    badRequest("Sản phẩm là bắt buộc");
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    badRequest("Danh sách dòng nhập là bắt buộc");
  }
  const product = await loadProduct(Number(body.productId));
  if (!product) notFound("Không tìm thấy sản phẩm");
  const importDate = isIsoDate(body.importDate) ? body.importDate : todayIsoDate();
  const batchCode = `IMP-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;

  const rows = body.items.map((item: any) => {
    if (isBlank(item?.variantName)) badRequest("Tên phân loại là bắt buộc");
    const importPrice = money(item.importPrice);
    if (importPrice < 0n) badRequest("Giá nhập phải >= 0");
    const quantity = requirePositiveQuantity(item.quantity);
    return {
      product_id: product.id,
      product_name: product.name,
      variant_name: String(item.variantName).trim(),
      import_price: toDbMoney(importPrice),
      quantity: toDbQty(quantity),
      transaction_type: "IMPORT",
      source: "MANUAL",
      batch_code: batchCode,
      invoice_file: body.invoiceFile ?? null,
      transaction_date: importDate,
      note: body.note ?? null,
    };
  });

  const inserted = await unwrap<any[]>(
    db.from("inventory_transactions").insert(rows).select("*"),
  );
  return inserted.map(inventoryTransactionDto);
}

export async function getSellableQuantityByImportTransaction(importTransactionId: number) {
  const tx = await maybeOne<any>(
    db
      .from("inventory_transactions")
      .select("*")
      .eq("id", importTransactionId)
      .eq("transaction_type", "IMPORT")
      .single(),
  );
  if (!tx) return 0n;

  const orderItems = await unwrap<any[]>(
    db
      .from("sales_order_items")
      .select("order_id,quantity")
      .eq("import_transaction_id", importTransactionId),
  );
  let usedInOrders = 0n;
  if (orderItems.length > 0) {
    const orders = await unwrap<any[]>(
      db
        .from("sales_orders")
        .select("id,status")
        .in("id", orderItems.map((item) => item.order_id)),
    );
    const statusById = new Map(orders.map((order) => [Number(order.id), order.status]));
    for (const item of orderItems) {
      if (statusById.get(Number(item.order_id)) !== "CANCELLED") {
        usedInOrders += qty(item.quantity);
      }
    }
  }

  const manualExports = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("quantity")
      .eq("import_transaction_id", importTransactionId)
      .eq("transaction_type", "EXPORT")
      .eq("source", "MANUAL"),
  );
  const manuallyExported = manualExports.reduce(
    (sum, row) => sum + qty(row.quantity),
    0n,
  );
  return qty(tx.quantity) - usedInOrders - manuallyExported;
}

export async function exportStock(body: any) {
  if (!body) badRequest("Thiếu dữ liệu request");
  if (body.productId === null || body.productId === undefined) {
    badRequest("Sản phẩm là bắt buộc");
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    badRequest("Danh sách dòng xuất là bắt buộc");
  }
  const product = await loadProduct(Number(body.productId));
  if (!product) notFound("Không tìm thấy sản phẩm");
  const transactionDate = isIsoDate(body.transactionDate)
    ? body.transactionDate
    : todayIsoDate();

  const rows = [];
  for (const item of body.items) {
    if (isBlank(item?.variantName)) badRequest("Tên phân loại là bắt buộc");
    const quantity = requirePositiveQuantity(item.quantity);
    const importTransactionId = Number(item.importTransactionId ?? 0);
    if (!Number.isFinite(importTransactionId) || importTransactionId <= 0) {
      badRequest("Lô nhập là bắt buộc");
    }
    const sellable = await getSellableQuantityByImportTransaction(importTransactionId);
    if (sellable < quantity) {
      badRequest(
        `Lô nhập #${importTransactionId} không đủ tồn để xuất (Còn: ${toNumberQty(sellable)})`,
      );
    }
    rows.push({
      product_id: product.id,
      product_name: product.name,
      variant_name: String(item.variantName).trim(),
      quantity: toDbQty(quantity),
      transaction_type: "EXPORT",
      source: "MANUAL",
      import_transaction_id: importTransactionId,
      transaction_date: transactionDate,
      note: body.note ?? null,
    });
  }

  const inserted = await unwrap<any[]>(
    db.from("inventory_transactions").insert(rows).select("*"),
  );
  return inserted.map(inventoryTransactionDto);
}

export async function getImportOptions(query: URLSearchParams) {
  const productId = Number(query.get("productId") ?? "0");
  const variantName = trimOrNull(query.get("variantName"));
  if (!Number.isFinite(productId) || productId <= 0) {
    badRequest("Sản phẩm là bắt buộc");
  }
  if (!variantName) badRequest("Phân loại là bắt buộc");

  const rows = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("*")
      .eq("transaction_type", "IMPORT")
      .eq("product_id", productId)
      .ilike("variant_name", variantName)
      .order("transaction_date", { ascending: false })
      .order("id", { ascending: false }),
  );
  const options = [];
  for (const row of rows) {
    const sellableQuantity = await getSellableQuantityByImportTransaction(Number(row.id));
    if (sellableQuantity > 0n) {
      options.push({
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        variantName: row.variant_name,
        importPrice: toNumberMoney(nvlMoney(row.import_price)),
        quantity: toNumberQty(qty(row.quantity)),
        sellableQuantity: toNumberQty(sellableQuantity),
        transactionDate: row.transaction_date,
        batchCode: row.batch_code,
      });
    }
  }
  return options;
}

export async function getCurrentStock(productId: number, variantName: string) {
  const product = await loadProduct(productId);
  const rows = await fetchAllTransactions();
  return rows.reduce((sum, row) => {
    const productMatched = Number(row.product_id) === productId ||
      (row.product_id === null && product && equalsIgnoreCase(row.product_name, product.name));
    if (!productMatched || !equalsIgnoreCase(row.variant_name, variantName)) return sum;
    return row.transaction_type === "IMPORT"
      ? sum + qty(row.quantity)
      : sum - qty(row.quantity);
  }, 0n);
}

async function getPendingQuantity(productId: number, variantName: string) {
  const pending = await pendingQuantitiesByKey();
  return pending.get(`${productId}|${variantName.toLowerCase()}`) ?? 0n;
}

export async function getSellableQuantity(productId: number, variantName: string) {
  return await getCurrentStock(productId, variantName) -
    await getPendingQuantity(productId, variantName);
}

export async function getAverageImportPrice(productId: number, variantName: string) {
  const rows = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("*")
      .eq("transaction_type", "IMPORT")
      .eq("product_id", productId)
      .ilike("variant_name", variantName),
  );
  let totalQuantity = 0n;
  let totalAmount = 0n;
  for (const row of rows) {
    const quantity = qty(row.quantity);
    totalQuantity += quantity;
    totalAmount += moneyTimesQtyToMoney(nvlMoney(row.import_price), quantity);
  }
  return averageMoney(totalAmount, totalQuantity);
}

export async function exportStockForOrder(order: any, item: any) {
  const available = await getCurrentStock(Number(item.product_id), item.variant_name);
  const quantity = qty(item.quantity);
  if (available < quantity) badRequest("Không đủ tồn kho để xuất hàng");
  const inserted = await unwrap<any>(
    db
      .from("inventory_transactions")
      .insert({
        product_id: item.product_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        import_price: item.import_unit_price === null ? null : item.import_unit_price,
        quantity: toDbQty(quantity),
        transaction_type: "EXPORT",
        source: "ORDER",
        source_id: order.id,
        transaction_date: order.sale_date ?? todayIsoDate(),
        note: order.order_type === "IN_STORE"
          ? `Bán tại cửa hàng: ${order.order_code}`
          : `Xuất kho cho đơn hàng: ${order.order_code}`,
      })
      .select("*")
      .single(),
  );
  return inventoryTransactionDto(inserted);
}

export async function reverseOrderExportTransactions(orderId: number) {
  const exports = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("*")
      .eq("source", "ORDER")
      .eq("source_id", orderId),
  );
  for (const exportTx of exports) {
    await unwrap(
      db.from("inventory_transactions").insert({
        product_id: exportTx.product_id,
        product_name: exportTx.product_name,
        variant_name: exportTx.variant_name,
        import_price: exportTx.import_price,
        quantity: exportTx.quantity,
        transaction_type: "IMPORT",
        source: "MANUAL",
        source_id: orderId,
        transaction_date: todayIsoDate(),
        note: `Hoàn lại kho do hủy đơn hàng (Order ID: ${orderId})`,
      }),
    );
    await unwrap(db.from("inventory_transactions").delete().eq("id", exportTx.id));
  }
}

export async function restoreStockFromCancelledOrder(order: any) {
  const duplicate = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("id")
      .ilike("note", `Hoàn lại kho từ đơn hủy ${order.order_code}%`)
      .in("source", ["MANUAL", "ORDER_CANCEL"])
      .limit(1),
  );
  if (duplicate.length > 0) badRequest("Đơn hàng đã được hoàn kho");

  const exports = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("*")
      .eq("source", "ORDER")
      .eq("source_id", order.id),
  );
  for (const exportTx of exports) {
    await unwrap(
      db.from("inventory_transactions").insert({
        product_id: exportTx.product_id,
        product_name: exportTx.product_name,
        variant_name: exportTx.variant_name,
        import_price: exportTx.import_price,
        quantity: exportTx.quantity,
        transaction_type: "IMPORT",
        source: "ORDER_CANCEL",
        source_id: order.id,
        import_transaction_id: exportTx.import_transaction_id,
        transaction_date: todayIsoDate(),
        note: `Hoàn lại kho từ đơn hủy ${order.order_code}`,
      }),
    );
  }
}

export async function deleteTransaction(id: number) {
  const tx = await maybeOne<any>(
    db.from("inventory_transactions").select("*").eq("id", id).single(),
  );
  if (!tx) notFound("Không tìm thấy giao dịch kho");
  if (tx.source === "ORDER") {
    badRequest("Không thể xóa giao dịch phát sinh từ luồng đơn hàng");
  }

  if (tx.transaction_type === "IMPORT") {
    const orderItems = await unwrap<any[]>(
      db
        .from("sales_order_items")
        .select("id,order_id")
        .eq("import_transaction_id", id),
    );
    if (orderItems.length > 0) {
      const orders = await unwrap<any[]>(
        db
          .from("sales_orders")
          .select("id,status")
          .in("id", orderItems.map((item) => item.order_id)),
      );
      if (orders.some((order) => order.status !== "CANCELLED")) {
        badRequest("Lô nhập kho đã được dùng trong đơn hàng, không thể xóa");
      }
    }

    const current = await getCurrentStock(Number(tx.product_id), tx.variant_name);
    const pending = await getPendingQuantity(Number(tx.product_id), tx.variant_name);
    if (current - qty(tx.quantity) - pending < 0n) {
      badRequest("Không thể xóa giao dịch nhập kho vì sẽ làm âm tồn khả dụng");
    }
  }

  await unwrap(db.from("inventory_transactions").delete().eq("id", id));
  return emptyOk();
}
