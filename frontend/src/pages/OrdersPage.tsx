import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataState } from "../components/DataState";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { catalogService } from "../services/catalogService";
import { inventoryService } from "../services/inventoryService";
import { orderService } from "../services/orderService";
import { shippingService } from "../services/shippingService";
import { availableTransitions, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "../types/constants";
import type { InventoryImportOption, Order, OrderStatus, Product, ShippingProvider } from "../types/models";
import type { OrderForm } from "../types/forms";
import { todayIsoDate } from "../utils/date";
import { formatMoney, formatNumber } from "../utils/format";
import { firstError, minNumber, positiveNumber, required } from "../utils/validation";

const emptyOrder: OrderForm = {
  orderType: "ONLINE",
  customerName: "",
  customerAddress: "",
  customerPhone: "",
  saleDate: todayIsoDate(),
  shippingFee: 0,
  discountAmount: 0,
  note: "",
  items: [{ productId: 0, variantName: "", importTransactionId: 0, quantity: 1, unitSalePrice: 0, discountAmount: 0, warrantyMonths: null }],
  extraCosts: [],
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [form, setForm] = useState<OrderForm>(emptyOrder);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"" | "ONLINE" | "IN_STORE">("");
  const [customerName, setCustomerName] = useState("");
  const [lotOptions, setLotOptions] = useState<Record<number, InventoryImportOption[]>>({});
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
  const [shippingForm, setShippingForm] = useState({
    shippingProviderId: 0,
    shippingProviderName: "",
    shipperName: "",
    shipperPhone: "",
    actualShippingFee: 0,
    additionalCost: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [orderResult, productResult, providerResult] = await Promise.all([
        orderService.list({ page, size: 20, customerName, status: statusFilter, orderType: orderTypeFilter }),
        catalogService.products({ page: 0, size: 500 }),
        shippingService.list({ page: 0, size: 500 }),
      ]);
      setOrders(orderResult.items);
      setTotalPages(orderResult.totalPages);
      setProducts(productResult.items);
      setProviders(providerResult.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, statusFilter, orderTypeFilter]);

  function updateItem(index: number, patch: Partial<OrderForm["items"][number]>) {
    const next = [...form.items];
    next[index] = { ...next[index], ...patch };
    setForm({ ...form, items: next });
  }

  async function refreshLots(index: number, productId: number, variantName: string) {
    if (!productId || !variantName) return;
    try {
      const options = await inventoryService.importOptions(productId, variantName);
      setLotOptions((current) => ({ ...current, [index]: options }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function validateOrder() {
    const first = form.items[0];
    return firstError([
      required(form.orderType, "Loại đơn hàng là bắt buộc"),
      required(form.customerName, "Tên khách hàng là bắt buộc"),
      required(form.customerAddress, "Địa chỉ khách hàng là bắt buộc"),
      minNumber(form.shippingFee, 0, "Phí giao hàng phải >= 0"),
      minNumber(form.discountAmount, 0, "Giảm giá phải >= 0"),
      minNumber(first?.productId ?? 0, 1, "Sản phẩm là bắt buộc"),
      required(first?.variantName, "Phân loại là bắt buộc"),
      minNumber(first?.importTransactionId ?? 0, 1, "Lô nhập là bắt buộc"),
      positiveNumber(first?.quantity ?? 0, "Số lượng phải > 0"),
      minNumber(first?.unitSalePrice ?? -1, 0, "Giá bán phải >= 0"),
      minNumber(first?.discountAmount ?? -1, 0, "Giảm giá dòng hàng phải >= 0"),
    ]);
  }

  async function submit() {
    const validation = validateOrder();
    if (validation) return setError(validation);
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        extraCosts: form.extraCosts.filter((cost) => cost.costName.trim()),
      };
      if (form.id) await orderService.update(payload);
      else await orderService.create(payload);
      setForm(emptyOrder);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function edit(order: Order) {
    setForm({
      id: order.id,
      orderType: order.orderType,
      customerName: order.customerName,
      customerAddress: order.customerAddress ?? "",
      customerPhone: order.customerPhone ?? "",
      saleDate: order.saleDate,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      note: order.note ?? "",
      items: order.items.map((item) => ({
        productId: item.productId,
        variantName: item.variantName,
        importTransactionId: item.importTransactionId ?? 0,
        quantity: item.quantity,
        unitSalePrice: item.unitSalePrice,
        discountAmount: item.discountAmount,
        warrantyMonths: item.warrantyMonths ?? null,
      })),
      extraCosts: order.extraCosts.map((cost) => ({ costName: cost.costName, amount: cost.amount })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(order: Order) {
    if (!window.confirm("Xóa đơn hàng này?")) return;
    try {
      await orderService.delete(order.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function changeStatus(order: Order, status: OrderStatus) {
    if (status === "SHIPPING") {
      setShippingOrder(order);
      setShippingForm({
        shippingProviderId: order.shippingProviderId ?? 0,
        shippingProviderName: order.shippingProviderName ?? "",
        shipperName: order.shipperName ?? "",
        shipperPhone: order.shipperPhone ?? "",
        actualShippingFee: order.shippingFee,
        additionalCost: 0,
      });
      return;
    }
    if (status === "CANCELLED" && !window.confirm("Hủy đơn hàng này?")) return;
    try {
      await orderService.updateStatus(order.id, { status });
      if (status === "CANCELLED" && order.orderType === "IN_STORE" && window.confirm("Hoàn kho cho đơn tại cửa hàng đã hủy?")) {
        await orderService.restoreStock(order.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submitShipping() {
    if (!shippingOrder) return;
    try {
      await orderService.updateStatus(shippingOrder.id, {
        status: "SHIPPING",
        ...shippingForm,
        shippingProviderId: shippingForm.shippingProviderId || null,
      });
      setShippingOrder(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const subTotal = form.items.reduce((sum, item) => sum + Math.max(0, item.quantity * item.unitSalePrice - item.discountAmount), 0);
  const extraTotal = form.extraCosts.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Đơn hàng</h1>
          <p>Online trừ kho khi đã giao; tại cửa hàng trừ kho ngay khi tạo.</p>
        </div>
        <div className="toolbar">
          <label className="field"><span>Khách hàng</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} /></label>
          <label className="field"><span>Trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "")}><option value="">Tất cả</option>{Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Loại</span><select value={orderTypeFilter} onChange={(event) => setOrderTypeFilter(event.target.value as "" | "ONLINE" | "IN_STORE")}><option value="">Tất cả</option><option value="ONLINE">Online</option><option value="IN_STORE">Tại cửa hàng</option></select></label>
          <button className="secondary" onClick={() => void load()}>Tìm</button>
        </div>
      </div>

      <DataState loading={loading} error={error} empty={false}>
        <div className="grid two">
          <section className="form-panel">
            <h2>{form.id ? "Cập nhật đơn" : "Tạo đơn"}</h2>
            <div className="form-grid">
              <label className="field"><span>Loại đơn</span><select value={form.orderType} onChange={(event) => setForm({ ...form, orderType: event.target.value as "ONLINE" | "IN_STORE" })}><option value="ONLINE">Online</option><option value="IN_STORE">Tại cửa hàng</option></select></label>
              <label className="field"><span>Ngày bán</span><input type="date" value={form.saleDate} onChange={(event) => setForm({ ...form, saleDate: event.target.value })} /></label>
              <label className="field"><span>Khách hàng</span><input value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label>
              <label className="field"><span>Điện thoại</span><input value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} /></label>
              <label className="field full"><span>Địa chỉ</span><input value={form.customerAddress} onChange={(event) => setForm({ ...form, customerAddress: event.target.value })} /></label>
              <label className="field"><span>Phí ship</span><input type="number" min={0} value={form.shippingFee} onChange={(event) => setForm({ ...form, shippingFee: Number(event.target.value) })} /></label>
              <label className="field"><span>Giảm giá đơn</span><input type="number" min={0} value={form.discountAmount} onChange={(event) => setForm({ ...form, discountAmount: Number(event.target.value) })} /></label>
              <label className="field full"><span>Ghi chú</span><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
            </div>

            <div className="inline-list">
              <strong>Sản phẩm</strong>
              {form.items.map((item, index) => {
                const product = productById.get(item.productId);
                return (
                  <div className="inline-row" key={index}>
                    <select value={item.productId} onChange={(event) => updateItem(index, { productId: Number(event.target.value), variantName: "", importTransactionId: 0 })}><option value={0}>Sản phẩm</option>{products.map((productItem) => <option key={productItem.id} value={productItem.id}>{productItem.name}</option>)}</select>
                    <select value={item.variantName} onChange={(event) => {
                      const variantName = event.target.value;
                      updateItem(index, { variantName, importTransactionId: 0 });
                      void refreshLots(index, item.productId, variantName);
                    }}><option value="">Phân loại</option>{product?.variants.map((variant) => <option key={variant.variantName} value={variant.variantName}>{variant.variantName}</option>)}</select>
                    <select value={item.importTransactionId ?? 0} onFocus={() => void refreshLots(index, item.productId, item.variantName)} onChange={(event) => updateItem(index, { importTransactionId: Number(event.target.value) })}><option value={0}>Lô nhập</option>{(lotOptions[index] ?? []).map((option) => <option key={option.id} value={option.id}>#{option.id} còn {formatNumber(option.sellableQuantity)}</option>)}</select>
                    <input type="number" min={0.000001} step={0.000001} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} />
                    <input type="number" min={0} placeholder="Giá bán" value={item.unitSalePrice} onChange={(event) => updateItem(index, { unitSalePrice: Number(event.target.value) })} />
                    <input type="number" min={0} placeholder="Giảm giá" value={item.discountAmount} onChange={(event) => updateItem(index, { discountAmount: Number(event.target.value) })} />
                    <button className="ghost" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
                  </div>
                );
              })}
              <button className="secondary" onClick={() => setForm({ ...form, items: [...form.items, { productId: 0, variantName: "", importTransactionId: 0, quantity: 1, unitSalePrice: 0, discountAmount: 0, warrantyMonths: null }] })}><Plus size={16} /> Thêm sản phẩm</button>
            </div>

            <div className="inline-list">
              <strong>Chi phí phụ</strong>
              {form.extraCosts.map((cost, index) => (
                <div className="inline-row" key={index}>
                  <input placeholder="Tên chi phí" value={cost.costName} onChange={(event) => {
                    const next = [...form.extraCosts];
                    next[index] = { ...cost, costName: event.target.value };
                    setForm({ ...form, extraCosts: next });
                  }} />
                  <input type="number" min={0} value={cost.amount} onChange={(event) => {
                    const next = [...form.extraCosts];
                    next[index] = { ...cost, amount: Number(event.target.value) };
                    setForm({ ...form, extraCosts: next });
                  }} />
                  <button className="ghost" onClick={() => setForm({ ...form, extraCosts: form.extraCosts.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
                </div>
              ))}
              <button className="secondary" onClick={() => setForm({ ...form, extraCosts: [...form.extraCosts, { costName: "", amount: 0 }] })}><Plus size={16} /> Thêm chi phí</button>
            </div>

            <div className="metric">
              <span>Tạm tính</span>
              <strong>{formatMoney(subTotal + extraTotal + form.shippingFee - form.discountAmount)}</strong>
            </div>
            <div className="toolbar">
              <button className="primary" onClick={() => void submit()}><Save size={16} /> Lưu đơn</button>
              <button className="ghost" onClick={() => setForm(emptyOrder)}>Làm mới</button>
            </div>
          </section>

          <section className="section">
            <h2>Danh sách đơn hàng</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Mã đơn</th><th>Khách</th><th>Loại</th><th>Trạng thái</th><th>Tổng</th><th></th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderCode}<br /><small>{order.saleDate}</small></td>
                      <td>{order.customerName}<br /><small>{order.customerPhone}</small></td>
                      <td>{ORDER_TYPE_LABELS[order.orderType]}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>{formatMoney(order.totalAmount)}</td>
                      <td>
                        <div className="row-actions">
                          {order.status === "CREATED" && <button className="secondary" onClick={() => edit(order)}>Sửa</button>}
                          {availableTransitions(order.orderType, order.status).map((status) => <button key={status} className={status === "CANCELLED" ? "danger" : "secondary"} onClick={() => void changeStatus(order, status)}>{ORDER_STATUS_LABELS[status]}</button>)}
                          <button className="danger" onClick={() => void remove(order)}>Xóa</button>
                        </div>
                        <details>
                          <summary>Chi tiết</summary>
                          <ul>{order.items.map((item) => <li key={`${item.productId}-${item.variantName}`}>{item.productName} / {item.variantName}: {formatNumber(item.quantity)} x {formatMoney(item.unitSalePrice)}</li>)}</ul>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </section>
        </div>
      </DataState>

      {shippingOrder && (
        <div className="section" style={{ marginTop: 16 }}>
          <h2>Bắt đầu giao hàng: {shippingOrder.orderCode}</h2>
          <div className="form-grid">
            <label className="field"><span>Provider lưu</span><select value={shippingForm.shippingProviderId} onChange={(event) => {
              const providerId = Number(event.target.value);
              const provider = providers.find((item) => item.id === providerId);
              setShippingForm({
                ...shippingForm,
                shippingProviderId: providerId,
                shippingProviderName: provider ? "" : shippingForm.shippingProviderName,
                shipperName: provider?.shippers[0]?.shipperName ?? shippingForm.shipperName,
                shipperPhone: provider?.shippers[0]?.shipperPhone ?? shippingForm.shipperPhone,
              });
            }}><option value={0}>Nhập tay</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.providerName}</option>)}</select></label>
            <label className="field"><span>Provider nhập tay</span><input value={shippingForm.shippingProviderName} onChange={(event) => setShippingForm({ ...shippingForm, shippingProviderName: event.target.value })} /></label>
            <label className="field"><span>Shipper</span><input value={shippingForm.shipperName} onChange={(event) => setShippingForm({ ...shippingForm, shipperName: event.target.value })} /></label>
            <label className="field"><span>SĐT shipper</span><input value={shippingForm.shipperPhone} onChange={(event) => setShippingForm({ ...shippingForm, shipperPhone: event.target.value })} /></label>
            <label className="field"><span>Phí ship thực tế</span><input type="number" min={0} value={shippingForm.actualShippingFee} onChange={(event) => setShippingForm({ ...shippingForm, actualShippingFee: Number(event.target.value) })} /></label>
            <label className="field"><span>Chi phí phát sinh</span><input type="number" min={0} value={shippingForm.additionalCost} onChange={(event) => setShippingForm({ ...shippingForm, additionalCost: Number(event.target.value) })} /></label>
          </div>
          <div className="toolbar">
            <button className="primary" onClick={() => void submitShipping()}>Xác nhận giao hàng</button>
            <button className="ghost" onClick={() => setShippingOrder(null)}>Hủy</button>
          </div>
        </div>
      )}
    </>
  );
}
