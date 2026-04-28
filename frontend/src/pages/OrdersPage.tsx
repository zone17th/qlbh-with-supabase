import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataState } from "../components/DataState";
import { DatePicker } from "../components/DatePicker";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { catalogService } from "../services/catalogService";
import { inventoryService } from "../services/inventoryService";
import { orderService } from "../services/orderService";
import { shippingService } from "../services/shippingService";
import { availableTransitions, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from "../types/constants";
import type { OrderForm } from "../types/forms";
import type { InventoryImportOption, Order, OrderStatus, OrderType, Product, ShippingProvider } from "../types/models";
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
  items: [],
  extraCosts: [],
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  
  const [form, setForm] = useState<OrderForm>(emptyOrder);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
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

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [orderRes, productRes, providerRes] = await Promise.all([
        orderService.list({
          page,
          size: 20,
          customerName: customerName || undefined,
          status: statusFilter || undefined,
          orderType: orderTypeFilter || undefined,
        }),
        catalogService.products({ page: 0, size: 5000 }),
        shippingService.list({ page: 0, size: 100 }),
      ]);
      setOrders(orderRes.items);
      setTotalPages(orderRes.totalPages);
      setProducts(productRes.items);
      setProviders(providerRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, statusFilter, orderTypeFilter]);

  async function refreshLots(index: number, productId: number, variantName: string) {
    if (!productId || !variantName) return;
    try {
      const options = await inventoryService.importOptions(productId, variantName);
      setLotOptions((prev) => ({ ...prev, [index]: options }));
    } catch (err) {
      console.error("Lỗi lấy lô nhập:", err);
    }
  }

  function updateItem(index: number, partial: Partial<OrderForm["items"][0]>) {
    const next = [...form.items];
    next[index] = { ...next[index], ...partial };
    setForm({ ...form, items: next });
  }

  function validateOrder() {
    const first = form.items[0];
    return firstError([
      required(form.customerName, "Tên khách hàng là bắt buộc"),
      required(form.saleDate, "Ngày bán là bắt buộc"),
      form.orderType === "ONLINE" ? required(form.customerAddress, "Địa chỉ là bắt buộc với đơn online") : { valid: true },
      form.items.length > 0 ? { valid: true } : { valid: false, message: "Đơn hàng phải có ít nhất 1 sản phẩm" },
      minNumber(form.shippingFee, 0, "Phí ship phải >= 0"),
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
    if (validation) return alert(validation);
    setLoading(true);
    try {
      const payload = { ...form, extraCosts: form.extraCosts.filter((cost) => cost.costName.trim()) };
      if (form.id) await orderService.update(payload);
      else await orderService.create(payload);
      setForm(emptyOrder);
      setIsModalOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function edit(order: Order, readOnly = false) {
    setIsReadOnly(readOnly);
    setForm({
      id: order.id,
      orderCode: order.orderCode,
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
    order.items.forEach((item, index) => {
      void refreshLots(index, item.productId, item.variantName);
    });
    setIsModalOpen(true);
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
  const initialCost = form.items.reduce((sum, item, index) => {
    const lot = (lotOptions[index] ?? []).find(o => o.id === item.importTransactionId);
    return sum + (lot ? lot.importPrice * item.quantity : 0);
  }, 0);
  const customerPays = subTotal + extraTotal + form.shippingFee - form.discountAmount;
  const projectedProfit = customerPays - initialCost - form.shippingFee - extraTotal;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
        <p className="text-gray-600 mt-2">Theo dõi vận chuyển, quản lý trạng thái và chỉnh sửa đơn hàng</p>
      </div>

      <button 
        onClick={() => { setForm(emptyOrder); setIsReadOnly(false); setIsModalOpen(true); }}
        className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors shadow-soft-md"
      >
        + Tạo đơn hàng mới
      </button>

      {/* Error */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-soft-md p-5 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Tên khách hàng</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} placeholder="Tìm kiếm tên khách hàng..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Loại đơn hàng</label>
            <select value={orderTypeFilter} onChange={(e) => setOrderTypeFilter(e.target.value as "" | "ONLINE" | "IN_STORE")} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tất cả loại</option>
              <option value="ONLINE">Online</option>
              <option value="IN_STORE">Tại cửa hàng</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Trạng thái đơn hàng</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tất cả trạng thái</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button onClick={() => void load()} className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors">
              🔍 Tìm kiếm
            </button>
            <button
              onClick={() => { setCustomerName(""); setOrderTypeFilter(""); setStatusFilter(""); if (page === 0) void load(); else setPage(0); }}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              ↻ Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách */}
      <DataState loading={loading}>
        <div className="bg-white rounded-xl shadow-soft-md border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">Danh sách đơn hàng</h3>
          </div>
          {orders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-500">
              <span className="text-4xl mb-4">🛒</span>
              <p>Chưa có đơn hàng nào. Hãy tạo một đơn hàng mới để bắt đầu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Mã đơn</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Khách</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Loại</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Trạng thái</th>
                    <th className="px-6 py-3 text-right font-bold text-gray-700 uppercase tracking-wider text-xs">Tổng</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <button onClick={() => edit(order, true)} className="text-left font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors focus:outline-none">
                          {order.orderCode}
                        </button>
                        <div className="text-xs text-gray-500">{order.saleDate}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{order.customerName}</div>
                        <div className="text-xs text-gray-500">{order.customerPhone}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{ORDER_TYPE_LABELS[order.orderType]}</span>
                      </td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={order.status} /></td>
                      <td className="px-6 py-4 text-right font-semibold">{formatMoney(order.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-center gap-1">
                          {order.status === "CREATED" && (
                            <button onClick={() => edit(order)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-xs">✏️</button>
                          )}
                          {availableTransitions(order.orderType, order.status).map((status) => (
                            <button
                              key={status}
                              onClick={() => void changeStatus(order, status)}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                status === "CANCELLED"
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              }`}
                            >
                              {ORDER_STATUS_LABELS[status]}
                            </button>
                          ))}
                          <button onClick={() => void remove(order)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-xs">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </DataState>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-[90vw] max-h-[95vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {isReadOnly ? `Chi tiết đơn hàng: ${form.orderCode}` : (form.id ? "Cập nhật đơn hàng" : "Tạo đơn hàng mới")}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <fieldset disabled={isReadOnly} className="space-y-8 border-none m-0 p-0 min-w-0">
                {/* LOẠI ĐƠN HÀNG */}
                <section>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Loại đơn hàng</h3>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="orderType" value="ONLINE" checked={form.orderType === "ONLINE"} onChange={(e) => setForm({...form, orderType: e.target.value as OrderType})} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Đơn hàng online (giao hàng)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="orderType" value="IN_STORE" checked={form.orderType === "IN_STORE"} onChange={(e) => setForm({...form, orderType: e.target.value as OrderType})} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Bán tại cửa hàng (POS)</span>
                    </label>
                  </div>
                </section>

                {/* THÔNG TIN KHÁCH HÀNG */}
                <section>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Thông tin khách hàng</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-700 mb-1 required-label">Tên khách hàng</label>
                      <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Nhập tên khách hàng" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-700 mb-1">Số điện thoại</label>
                      <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Nhập số điện thoại" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-700 mb-1 required-label">Ngày bán</label>
                      <DatePicker value={form.saleDate} onChange={(val) => setForm({ ...form, saleDate: val })} />
                    </div>
                    <div className="flex flex-col md:col-span-3">
                      <label className="text-xs font-semibold text-gray-700 mb-1 required-label">Địa chỉ khách hàng</label>
                      <input value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} placeholder="Nhập địa chỉ giao hàng" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </section>

                {/* CHI TIẾT ĐƠN HÀNG */}
                <section>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Chi tiết đơn hàng</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-700 mb-1">Phí ship dự kiến</label>
                      <input type="number" min={0} value={form.shippingFee} onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-700 mb-1">Giảm giá đơn hàng</label>
                      <input type="number" min={0} value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: Number(e.target.value) })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-semibold text-gray-700 mb-1">Ghi chú</label>
                      <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú đơn hàng" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </section>

                {/* SẢN PHẨM */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Sản phẩm trong đơn</h3>
                    {!isReadOnly && (
                      <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { productId: 0, variantName: "", importTransactionId: 0, quantity: 1, unitSalePrice: 0, discountAmount: 0, warrantyMonths: null }] })} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm">
                        + Thêm sản phẩm
                      </button>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-gray-600">Sản phẩm</th>
                          <th className="px-4 py-3 font-semibold text-gray-600">Phân loại</th>
                          <th className="px-4 py-3 font-semibold text-gray-600">Lô tham chiếu</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 text-center">Tồn lô</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 w-20">Số lượng</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 w-28">Đơn giá</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 w-28">Giảm giá</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 w-24">Bảo hành</th>
                          <th className="px-4 py-3 font-semibold text-gray-600 text-right">Tổng</th>
                          {!isReadOnly && <th className="px-4 py-3 font-semibold text-gray-600 text-center w-12">Xóa</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {form.items.map((item, index) => {
                          const product = productById.get(item.productId);
                          const lots = lotOptions[index] ?? [];
                          const selectedLot = lots.find(l => l.id === item.importTransactionId);
                          const stock = selectedLot ? selectedLot.sellableQuantity : 0;
                          const lineTotal = Math.max(0, item.quantity * item.unitSalePrice - item.discountAmount);
                          return (
                            <tr key={index} className="hover:bg-gray-50/50">
                              <td className="p-2">
                                <select value={item.productId} onChange={(e) => updateItem(index, { productId: Number(e.target.value), variantName: "", importTransactionId: 0 })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                  <option value={0}>Chọn SP</option>
                                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </td>
                              <td className="p-2">
                                <select value={item.variantName} onChange={(e) => { updateItem(index, { variantName: e.target.value, importTransactionId: 0 }); void refreshLots(index, item.productId, e.target.value); }} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                  <option value="">Chọn loại</option>
                                  {product?.variants.map((v) => <option key={v.variantName} value={v.variantName}>{v.variantName}</option>)}
                                </select>
                              </td>
                              <td className="p-2">
                                <select value={item.importTransactionId ?? 0} onFocus={() => void refreshLots(index, item.productId, item.variantName)} onChange={(e) => updateItem(index, { importTransactionId: Number(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                  <option value={0}>Chọn lô (Bắt buộc)</option>
                                  {lots.map((o) => <option key={o.id} value={o.id}>#{o.id} - {o.batchCode || 'No batch'}</option>)}
                                </select>
                              </td>
                              <td className="p-2 text-center font-medium text-gray-600">{formatNumber(stock)}</td>
                              <td className="p-2">
                                <input type="number" min={0.000001} step={0.000001} value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-center" />
                              </td>
                              <td className="p-2">
                                <input type="number" min={0} value={item.unitSalePrice} onChange={(e) => updateItem(index, { unitSalePrice: Number(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                              </td>
                              <td className="p-2">
                                <input type="number" min={0} value={item.discountAmount} onChange={(e) => updateItem(index, { discountAmount: Number(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                              </td>
                              <td className="p-2">
                                <input type="number" min={0} value={item.warrantyMonths ?? ""} onChange={(e) => updateItem(index, { warrantyMonths: e.target.value ? Number(e.target.value) : null })} placeholder="Tháng" className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-center" />
                              </td>
                              <td className="p-2 text-right font-semibold text-gray-800">{formatMoney(lineTotal)}</td>
                              {!isReadOnly && (
                                <td className="p-2 text-center">
                                  <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">🗑️</button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* CHI PHÍ KHÁC */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Chi phí khác</h3>
                    {!isReadOnly && (
                      <button type="button" onClick={() => setForm({ ...form, extraCosts: [...form.extraCosts, { costName: "", amount: 0 }] })} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm">
                        + Thêm chi phí
                      </button>
                    )}
                  </div>
                  {form.extraCosts.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-gray-600">Tên chi phí</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 w-48 text-right">Số tiền</th>
                            {!isReadOnly && <th className="px-4 py-3 font-semibold text-gray-600 w-24 text-center">Thao tác</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {form.extraCosts.map((cost, index) => (
                            <tr key={index}>
                              <td className="p-2">
                                <input placeholder="Tên chi phí" value={cost.costName} onChange={(e) => { const next = [...form.extraCosts]; next[index] = { ...cost, costName: e.target.value }; setForm({ ...form, extraCosts: next }); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              </td>
                              <td className="p-2">
                                <input type="number" min={0} value={cost.amount} onChange={(e) => { const next = [...form.extraCosts]; next[index] = { ...cost, amount: Number(e.target.value) }; setForm({ ...form, extraCosts: next }); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                              </td>
                              {!isReadOnly && (
                                <td className="p-2 text-center">
                                  <button type="button" onClick={() => setForm({ ...form, extraCosts: form.extraCosts.filter((_, i) => i !== index) })} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">🗑️</button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* TỔNG KẾT */}
                <section className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row justify-between gap-6 shadow-sm">
                  <div className="flex-1 space-y-2 text-sm max-w-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Phí ban đầu:</span>
                      <span>{formatMoney(initialCost)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Lợi nhuận dự kiến:</span>
                      <span>{formatMoney(projectedProfit)}</span>
                    </div>
                    <div className="mt-4 pt-4">
                      {!isReadOnly && (
                        <button type="button" onClick={() => void submit()} className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-all shadow-md w-full md:w-auto">
                          ✓ {form.id ? "Cập nhật đơn hàng" : "Tạo đơn hàng"}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-2 text-sm max-w-sm ml-auto">
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng tiền hàng:</span>
                      <span className="font-semibold">{formatMoney(subTotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Phí ship dự kiến:</span>
                      <span className="font-semibold">{formatMoney(form.shippingFee)}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>Tổng giảm giá:</span>
                      <span className="font-semibold">-{formatMoney(form.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-2">
                      <span>Chi phí khác:</span>
                      <span className="font-semibold">{formatMoney(extraTotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-900 pt-2 text-base">
                      <span className="font-bold uppercase">Khách hàng cần thanh toán:</span>
                      <span className="font-bold text-blue-600">{formatMoney(customerPays)}</span>
                    </div>
                  </div>
                </section>
              </fieldset>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Dialog */}
      {shippingOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Bắt đầu giao hàng: {shippingOrder.orderCode}</h2>
              <button onClick={() => setShippingOrder(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">Provider lưu</label>
                  <select value={shippingForm.shippingProviderId} onChange={(e) => {
                    const providerId = Number(e.target.value);
                    const provider = providers.find((item) => item.id === providerId);
                    setShippingForm({
                      ...shippingForm,
                      shippingProviderId: providerId,
                      shippingProviderName: provider ? "" : shippingForm.shippingProviderName,
                      shipperName: provider?.shippers[0]?.shipperName ?? shippingForm.shipperName,
                      shipperPhone: provider?.shippers[0]?.shipperPhone ?? shippingForm.shipperPhone,
                    });
                  }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]">
                    <option value={0}>Nhập tay</option>
                    {providers.map((p) => <option key={p.id} value={p.id}>{p.providerName}</option>)}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">Provider nhập tay</label>
                  <input value={shippingForm.shippingProviderName} onChange={(e) => setShippingForm({ ...shippingForm, shippingProviderName: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">Shipper</label>
                  <input value={shippingForm.shipperName} onChange={(e) => setShippingForm({ ...shippingForm, shipperName: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">SĐT shipper</label>
                  <input value={shippingForm.shipperPhone} onChange={(e) => setShippingForm({ ...shippingForm, shipperPhone: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">Phí ship thực tế</label>
                  <input type="number" min={0} value={shippingForm.actualShippingFee} onChange={(e) => setShippingForm({ ...shippingForm, actualShippingFee: Number(e.target.value) })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-2">Chi phí phát sinh</label>
                  <input type="number" min={0} value={shippingForm.additionalCost} onChange={(e) => setShippingForm({ ...shippingForm, additionalCost: Number(e.target.value) })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
                </div>
              </div>
              <div className="flex gap-3 pt-6 mt-2 border-t border-gray-100">
                <button onClick={() => void submitShipping()} className="px-6 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-all shadow-soft-md">Xác nhận giao hàng</button>
                <button onClick={() => setShippingOrder(null)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all">Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
