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
  unexpected,
} from "../http.ts";
import {
  getAverageImportPrice,
  getSellableQuantity,
  getSellableQuantityByImportTransaction,
  exportStockForOrder,
  restoreStockFromCancelledOrder,
  reverseOrderExportTransactions,
} from "./inventory.ts";
import { findShipperName } from "./shipping.ts";
import {
  money,
  moneyTimesQtyToMoney,
  qty,
  toDbMoney,
  toDbQty,
  toNumberMoney,
  toNumberQty,
} from "../money.ts";
import type { OrderStatus, OrderType } from "../types.ts";

function orderDto(row: any) {
  return {
    id: row.id,
    orderCode: row.order_code,
    customerName: row.customer_name,
    customerAddress: row.customer_address,
    customerPhone: row.customer_phone,
    orderDate: row.order_date,
    saleDate: row.sale_date,
    status: row.status,
    orderType: row.order_type,
    note: row.note,
    subTotal: toNumberMoney(money(row.sub_total)),
    discountAmount: toNumberMoney(money(row.discount_amount)),
    extraCostTotal: toNumberMoney(money(row.extra_cost_total)),
    shippingFee: toNumberMoney(money(row.shipping_fee)),
    totalAmount: toNumberMoney(money(row.total_amount)),
    estimatedCostTotal: toNumberMoney(money(row.estimated_cost_total)),
    projectedProfit: toNumberMoney(money(row.projected_profit)),
    shippingProviderId: row.shipping_provider_id,
    shippingProviderName: row.shipping_provider_name,
    shipperName: row.shipper_name,
    shipperPhone: row.shipper_phone,
    actualShippingFee: row.actual_shipping_fee === null ? null : toNumberMoney(money(row.actual_shipping_fee)),
    additionalCost: row.additional_cost === null ? null : toNumberMoney(money(row.additional_cost)),
    actualProfit: row.actual_profit === null ? null : toNumberMoney(money(row.actual_profit)),
    items: [...(row.items ?? row.sales_order_items ?? [])]
      .sort((a: any, b: any) => Number(a.id) - Number(b.id))
      .map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        variantName: item.variant_name,
        importTransactionId: item.import_transaction_id,
        importTransactionDate: item.import_transaction_date,
        importUnitPrice: item.import_unit_price === null ? null : toNumberMoney(money(item.import_unit_price)),
        quantity: toNumberQty(qty(item.quantity)),
        sellableQuantity: toNumberQty(qty(item.sellable_quantity)),
        unitSalePrice: toNumberMoney(money(item.unit_sale_price)),
        discountAmount: toNumberMoney(money(item.discount_amount)),
        warrantyMonths: item.warranty_months,
        lineTotal: toNumberMoney(money(item.line_total)),
      })),
    extraCosts: [...(row.extraCosts ?? row.sales_order_extra_costs ?? [])]
      .sort((a: any, b: any) => Number(a.id) - Number(b.id))
      .map((cost: any) => ({
        id: cost.id,
        costName: cost.cost_name,
        amount: toNumberMoney(money(cost.amount)),
      })),
    shippingHistory: [...(row.shippingHistory ?? row.sales_order_shipping_history ?? [])]
      .sort((a: any, b: any) => Number(a.id) - Number(b.id))
      .map((history: any) => ({
        id: history.id,
        status: history.status,
        changedAt: history.changed_at,
        note: history.note,
      })),
  };
}

async function loadOrder(id: number) {
  return await maybeOne<any>(
    db
      .from("sales_orders")
      .select(
        "*, items:sales_order_items(*), extraCosts:sales_order_extra_costs(*), shippingHistory:sales_order_shipping_history(*)",
      )
      .eq("id", id)
      .single(),
  );
}

async function loadProduct(productId: number) {
  return await maybeOne<any>(
    db
      .from("products")
      .select("*, category:product_categories(*), variants:product_variants(*)")
      .eq("id", productId)
      .single(),
  );
}

async function appendHistory(orderId: number, status: OrderStatus, note: string) {
  await unwrap(
    db.from("sales_order_shipping_history").insert({
      order_id: orderId,
      status,
      note,
    }),
  );
}

function asOrderType(value: unknown): OrderType | null {
  return value === "ONLINE" || value === "IN_STORE" ? value : null;
}

function asOrderStatus(value: unknown): OrderStatus | null {
  const status = String(value ?? "").toUpperCase();
  return [
    "CREATED",
    "PACKAGED",
    "SHIPPING",
    "SHIPPED",
    "PAYMENT_PENDING",
    "COMPLETED",
    "CANCELLED",
  ].includes(status)
    ? status as OrderStatus
    : null;
}

function validateCreateRequest(body: any) {
  if (!body) badRequest("Thiếu dữ liệu request");
  if (!asOrderType(body.orderType)) badRequest("Loại đơn hàng là bắt buộc");
  if (isBlank(body.customerName)) badRequest("Tên khách hàng là bắt buộc");
  if (!Array.isArray(body.items) || body.items.length === 0) {
    badRequest("Danh sách sản phẩm là bắt buộc");
  }
  if (body.shippingFee !== null && body.shippingFee !== undefined && money(body.shippingFee) < 0n) {
    badRequest("Phí giao hàng phải >= 0");
  }
  if (body.discountAmount !== null && body.discountAmount !== undefined && money(body.discountAmount) < 0n) {
    badRequest("Giảm giá phải >= 0");
  }
  for (const item of body.items) {
    if (item.productId === null || item.productId === undefined) badRequest("Sản phẩm là bắt buộc");
    if (isBlank(item.variantName)) badRequest("Phân loại là bắt buộc");
    if (qty(item.quantity) <= 0n) badRequest("Số lượng phải > 0");
    if (money(item.unitSalePrice) < 0n) badRequest("Giá bán phải >= 0");
    if (item.discountAmount !== null && item.discountAmount !== undefined && money(item.discountAmount) < 0n) {
      badRequest("Giảm giá dòng hàng phải >= 0");
    }
    if (item.warrantyMonths !== null && item.warrantyMonths !== undefined && Number(item.warrantyMonths) <= 0) {
      badRequest("Số tháng bảo hành phải lớn hơn 0");
    }
    if (item.importTransactionId !== null && item.importTransactionId !== undefined && Number(item.importTransactionId) <= 0) {
      badRequest("Lô nhập không hợp lệ");
    }
  }
  for (const cost of body.extraCosts ?? []) {
    if (isBlank(cost.costName)) badRequest("Tên chi phí là bắt buộc");
    if (money(cost.amount) < 0n) badRequest("Chi phí phải >= 0");
  }
}

async function mapOrderItem(item: any) {
  const productId = Number(item.productId);
  const product = await loadProduct(productId);
  if (!product) notFound("Không tìm thấy sản phẩm");
  const variantName = String(item.variantName).trim();
  const variantExists = (product.variants ?? []).some((variant: any) =>
    equalsIgnoreCase(variant.variant_name, variantName)
  );
  if (!variantExists) badRequest("Phân loại không thuộc sản phẩm đã chọn");

  const quantity = qty(item.quantity);
  const currentSellable = await getSellableQuantity(productId, variantName);
  if (currentSellable < quantity) badRequest("Không đủ tồn khả dụng");

  let importTransactionId: number | null = item.importTransactionId
    ? Number(item.importTransactionId)
    : null;
  let importTransactionDate: string | null = null;
  let importUnitPrice = await getAverageImportPrice(productId, variantName);

  if (importTransactionId) {
    const importTx = await maybeOne<any>(
      db
        .from("inventory_transactions")
        .select("*")
        .eq("id", importTransactionId)
        .single(),
    );
    if (!importTx || importTx.transaction_type !== "IMPORT") {
      badRequest("Không tìm thấy lô nhập");
    }
    if (Number(importTx.product_id) !== productId || !equalsIgnoreCase(importTx.variant_name, variantName)) {
      badRequest("Lô nhập không khớp sản phẩm/phân loại");
    }
    const lotSellable = await getSellableQuantityByImportTransaction(importTransactionId);
    if (lotSellable < quantity) badRequest("Lô nhập không đủ tồn khả dụng");
    importTransactionDate = importTx.transaction_date;
    importUnitPrice = money(importTx.import_price);
  }

  const unitSalePrice = money(item.unitSalePrice);
  const itemDiscount = item.discountAmount === null || item.discountAmount === undefined
    ? 0n
    : money(item.discountAmount);
  const lineTotal = moneyTimesQtyToMoney(unitSalePrice, quantity) - itemDiscount;
  if (lineTotal < 0n) badRequest("Thành tiền dòng hàng không được âm");
  const warrantyMonths = item.warrantyMonths ? Number(item.warrantyMonths) : Number(product.warranty_months);

  return {
    product_id: productId,
    product_name: product.name,
    variant_name: variantName,
    import_transaction_id: importTransactionId,
    import_transaction_date: importTransactionDate,
    import_unit_price: toDbMoney(importUnitPrice),
    quantity: toDbQty(quantity),
    sellable_quantity: toDbQty(currentSellable),
    unit_sale_price: toDbMoney(unitSalePrice),
    discount_amount: toDbMoney(itemDiscount),
    warranty_months: warrantyMonths,
    line_total: toDbMoney(lineTotal),
    _lineTotal: lineTotal,
    _estimatedCost: moneyTimesQtyToMoney(importUnitPrice, quantity),
  };
}

async function mapOrderPayload(body: any) {
  validateCreateRequest(body);
  const items = [];
  for (const item of body.items) items.push(await mapOrderItem(item));

  const extraCosts = (body.extraCosts ?? [])
    .filter((cost: any) => !isBlank(cost?.costName))
    .map((cost: any) => ({
      cost_name: String(cost.costName).trim(),
      amount: toDbMoney(money(cost.amount)),
      _amount: money(cost.amount),
    }));

  const subTotal = items.reduce((sum, item) => sum + item._lineTotal, 0n);
  const estimatedCostTotal = items.reduce((sum, item) => sum + item._estimatedCost, 0n);
  const extraCostTotal = extraCosts.reduce((sum: bigint, cost: any) => sum + cost._amount, 0n);
  const shippingFee = body.shippingFee === null || body.shippingFee === undefined
    ? 0n
    : money(body.shippingFee);
  const discountAmount = body.discountAmount === null || body.discountAmount === undefined
    ? 0n
    : money(body.discountAmount);
  const totalAmount = subTotal + extraCostTotal + shippingFee - discountAmount;
  if (totalAmount < 0n) badRequest("Tổng tiền đơn hàng không được âm");
  const projectedProfit = totalAmount - estimatedCostTotal - shippingFee - extraCostTotal;
  const orderDate = isIsoDate(body.orderDate) ? body.orderDate : todayIsoDate();
  const saleDate = isIsoDate(body.saleDate)
    ? body.saleDate
    : isIsoDate(body.orderDate)
    ? body.orderDate
    : todayIsoDate();

  return {
    order: {
      customer_name: String(body.customerName).trim(),
      customer_address: body.customerAddress ?? null,
      customer_phone: body.customerPhone ?? null,
      order_date: orderDate,
      sale_date: saleDate,
      order_type: asOrderType(body.orderType),
      note: body.note ?? null,
      sub_total: toDbMoney(subTotal),
      discount_amount: toDbMoney(discountAmount),
      extra_cost_total: toDbMoney(extraCostTotal),
      shipping_fee: toDbMoney(shippingFee),
      total_amount: toDbMoney(totalAmount),
      estimated_cost_total: toDbMoney(estimatedCostTotal),
      projected_profit: toDbMoney(projectedProfit),
    },
    items: items.map(({ _lineTotal, _estimatedCost, ...item }) => item),
    extraCosts: extraCosts.map(({ _amount, ...cost }: any) => cost),
  };
}

async function generateOrderCode() {
  const date = todayIsoDate().replaceAll("-", "");
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
    const orderCode = `ORD-${date}-${suffix}`;
    const existing = await unwrap<any[]>(
      db.from("sales_orders").select("id").eq("order_code", orderCode).limit(1),
    );
    if (existing.length === 0) return orderCode;
  }
  unexpected("Không thể sinh mã đơn hàng");
}

export async function listOrders(query: URLSearchParams) {
  const normalized = normalizeInMemoryPage(pageParam(query), sizeParam(query));
  const keyword = trimOrNull(query.get("keyword"));
  const customerName = trimOrNull(query.get("customerName"));
  const status = asOrderStatus(query.get("status"));
  const orderType = asOrderType(String(query.get("orderType") ?? "").toUpperCase());
  const productId = Number(query.get("productId") ?? "0");
  const variantName = trimOrNull(query.get("variantName"));
  const saleDateFrom = isIsoDate(query.get("saleDateFrom")) ? query.get("saleDateFrom") : null;
  const saleDateTo = isIsoDate(query.get("saleDateTo")) ? query.get("saleDateTo") : null;

  const rows = await unwrap<any[]>(
    db
      .from("sales_orders")
      .select(
        "*, items:sales_order_items(*), extraCosts:sales_order_extra_costs(*), shippingHistory:sales_order_shipping_history(*)",
      )
      .order("id", { ascending: false }),
  );

  const filtered = rows.filter((order) => {
    if (keyword) {
      const matched = includesIgnoreCase(order.order_code, keyword) ||
        includesIgnoreCase(order.customer_name, keyword) ||
        includesIgnoreCase(order.customer_address, keyword) ||
        includesIgnoreCase(order.customer_phone, keyword) ||
        includesIgnoreCase(order.status, keyword);
      if (!matched) return false;
    }
    if (customerName && !includesIgnoreCase(order.customer_name, customerName)) return false;
    if (status && order.status !== status) return false;
    if (orderType && order.order_type !== orderType) return false;
    if (Number.isFinite(productId) && productId > 0) {
      if (!(order.items ?? []).some((item: any) => Number(item.product_id) === productId)) return false;
    }
    if (variantName) {
      if (!(order.items ?? []).some((item: any) => equalsIgnoreCase(item.variant_name, variantName))) return false;
    }
    if (saleDateFrom && order.sale_date < saleDateFrom) return false;
    if (saleDateTo && order.sale_date > saleDateTo) return false;
    return true;
  });

  const from = normalized.page * normalized.size;
  return paged(
    filtered.slice(from, from + normalized.size).map(orderDto),
    normalized.page,
    normalized.size,
    filtered.length,
  );
}

export async function getOrder(id: number) {
  const row = await loadOrder(id);
  if (!row) notFound("Không tìm thấy đơn hàng");
  return orderDto(row);
}

export async function createOrder(body: any) {
  const mapped = await mapOrderPayload(body);
  const order = await unwrap<any>(
    db
      .from("sales_orders")
      .insert({
        ...mapped.order,
        order_code: await generateOrderCode(),
        status: "CREATED",
      })
      .select("*")
      .single(),
  );
  await unwrap(
    db.from("sales_order_items").insert(
      mapped.items.map((item) => ({ ...item, order_id: order.id })),
    ),
  );
  if (mapped.extraCosts.length > 0) {
    await unwrap(
      db.from("sales_order_extra_costs").insert(
        mapped.extraCosts.map((cost) => ({ ...cost, order_id: order.id })),
      ),
    );
  }
  await appendHistory(order.id, "CREATED", "Tạo đơn hàng");

  let current = (await loadOrder(order.id))!;
  if (order.order_type === "IN_STORE") {
    for (const item of current.items ?? []) {
      await exportStockForOrder(current, item);
    }
    await unwrap(
      db.from("sales_orders").update({ status: "PAYMENT_PENDING" }).eq("id", order.id),
    );
    await appendHistory(order.id, "PAYMENT_PENDING", "Chờ thanh toán tại quầy");
    current = (await loadOrder(order.id))!;
  }

  return orderDto(current);
}

export async function updateOrder(id: number, body: any) {
  const existing = await loadOrder(id);
  if (!existing) notFound("Không tìm thấy đơn hàng");
  if (existing.status !== "CREATED") {
    badRequest("Chỉ có thể chỉnh sửa đơn hàng ở trạng thái Mới tạo");
  }
  const mapped = await mapOrderPayload(body);
  await unwrap(db.from("sales_order_items").delete().eq("order_id", id));
  await unwrap(db.from("sales_order_extra_costs").delete().eq("order_id", id));
  await unwrap(
    db
      .from("sales_orders")
      .update({
        ...mapped.order,
        order_code: existing.order_code,
        status: existing.status,
      })
      .eq("id", id),
  );
  await unwrap(
    db.from("sales_order_items").insert(
      mapped.items.map((item) => ({ ...item, order_id: id })),
    ),
  );
  if (mapped.extraCosts.length > 0) {
    await unwrap(
      db.from("sales_order_extra_costs").insert(
        mapped.extraCosts.map((cost) => ({ ...cost, order_id: id })),
      ),
    );
  }
  await appendHistory(id, existing.status, "Chỉnh sửa thông tin đơn hàng");
  return orderDto((await loadOrder(id))!);
}

function validateTransition(orderType: OrderType, current: OrderStatus, target: OrderStatus) {
  const valid = orderType === "ONLINE"
    ? (
      (current === "CREATED" && ["PACKAGED", "CANCELLED"].includes(target)) ||
      (current === "PACKAGED" && ["SHIPPING", "CANCELLED"].includes(target)) ||
      (current === "SHIPPING" && ["SHIPPED", "CANCELLED"].includes(target))
    )
    : (
      (current === "CREATED" && ["COMPLETED", "CANCELLED"].includes(target)) ||
      (current === "PAYMENT_PENDING" && ["COMPLETED", "CANCELLED"].includes(target))
    );
  if (!valid) badRequest(`Luồng trạng thái không hợp lệ: ${current} -> ${target}`);
}

async function applyShippingInfo(order: any, body: any) {
  let providerName = trimOrNull(body.shippingProviderName);
  const shippingProviderId = body.shippingProviderId ? Number(body.shippingProviderId) : null;
  let shipperName = trimOrNull(body.shipperName);
  const shipperPhone = trimOrNull(body.shipperPhone);
  if (shippingProviderId) {
    const provider = await maybeOne<any>(
      db.from("shipping_providers").select("*").eq("id", shippingProviderId).single(),
    );
    if (!provider) notFound("Không tìm thấy đơn vị giao hàng");
    providerName = provider.provider_name;
  } else if (!providerName) {
    badRequest("Đơn vị giao hàng là bắt buộc");
  }
  if (!shipperPhone) badRequest("Số điện thoại shipper là bắt buộc");
  if (shippingProviderId && !shipperName) {
    shipperName = await findShipperName(shippingProviderId, shipperPhone);
  }
  if (!shipperName) badRequest("Tên shipper là bắt buộc");
  const actualShippingFee = body.actualShippingFee === null || body.actualShippingFee === undefined
    ? money(order.shipping_fee)
    : money(body.actualShippingFee);
  if (actualShippingFee < 0n) badRequest("Phí giao hàng thực tế phải >= 0");
  const additionalCost = body.additionalCost === null || body.additionalCost === undefined
    ? 0n
    : money(body.additionalCost);
  if (additionalCost < 0n) badRequest("Chi phí phát sinh phải >= 0");
  const actualProfit = money(order.total_amount) - money(order.estimated_cost_total) -
    actualShippingFee - additionalCost;
  return {
    shipping_provider_id: shippingProviderId,
    shipping_provider_name: providerName,
    shipper_name: shipperName,
    shipper_phone: shipperPhone,
    actual_shipping_fee: toDbMoney(actualShippingFee),
    additional_cost: toDbMoney(additionalCost),
    actual_profit: toDbMoney(actualProfit),
  };
}

export async function updateOrderStatus(id: number, body: any) {
  if (!body) badRequest("Thiếu dữ liệu request");
  const targetStatus = asOrderStatus(body.status);
  if (!targetStatus) badRequest("Trạng thái là bắt buộc");
  const order = await loadOrder(id);
  if (!order) notFound("Không tìm thấy đơn hàng");
  validateTransition(order.order_type, order.status, targetStatus);

  const patch: Record<string, unknown> = { status: targetStatus };
  if (targetStatus === "SHIPPING") {
    Object.assign(patch, await applyShippingInfo(order, body));
  }
  if (targetStatus === "SHIPPED") {
    for (const item of order.items ?? []) await exportStockForOrder(order, item);
  }
  if (targetStatus === "COMPLETED" && order.order_type === "IN_STORE") {
    Object.assign(patch, {
      actual_shipping_fee: "0.00",
      additional_cost: "0.00",
      actual_profit: order.projected_profit,
    });
    await appendHistory(id, "COMPLETED", "Khách đã thanh toán tại quầy");
  }
  await unwrap(db.from("sales_orders").update(patch).eq("id", id));
  await appendHistory(id, targetStatus, `Cập nhật trạng thái sang ${targetStatus}`);
  return orderDto((await loadOrder(id))!);
}

export async function deleteOrder(id: number) {
  const order = await loadOrder(id);
  if (!order) notFound("Không tìm thấy đơn hàng");
  if (["SHIPPED", "COMPLETED", "CANCELLED"].includes(order.status)) {
    badRequest("Chỉ có thể xóa đơn hàng ở trạng thái Mới tạo hoặc Chờ thanh toán");
  }
  await reverseOrderExportTransactions(id);
  await unwrap(db.from("sales_orders").delete().eq("id", id));
  return emptyOk();
}

export async function restoreOrderStock(id: number) {
  const order = await loadOrder(id);
  if (!order) notFound("Không tìm thấy đơn hàng");
  if (order.status !== "CANCELLED") badRequest("Chỉ hoàn kho cho đơn hàng đã hủy");
  if (order.order_type !== "IN_STORE") badRequest("Chỉ hoàn kho cho đơn bán tại cửa hàng");
  await restoreStockFromCancelledOrder(order);
  return orderDto((await loadOrder(id))!);
}
