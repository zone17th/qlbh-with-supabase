import { Search, RefreshCw, Plus, Save, Trash2, Box, Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataState } from "../components/DataState";
import { DatePicker } from "../components/DatePicker";
import { NumberInput } from "../components/NumberInput";
import { Pagination } from "../components/Pagination";
import { catalogService } from "../services/catalogService";
import { inventoryService } from "../services/inventoryService";
import type { InventoryImportOption, InventorySummary, InventoryTransaction, Product } from "../types/models";
import type { InventoryExportForm, InventoryImportForm } from "../types/forms";
import { formatDate, todayIsoDate } from "../utils/date";
import { formatMoney, formatNumber } from "../utils/format";
import { firstError, minNumber, positiveNumber, required, runValidation } from "../utils/validation";

const emptyImport: InventoryImportForm = {
  productId: 0,
  importDate: todayIsoDate(),
  note: "",
  invoiceFile: "",
  items: [{ variantName: "", importPrice: 0, quantity: 1 }],
};

const emptyExport: InventoryExportForm = {
  productId: 0,
  transactionDate: todayIsoDate(),
  note: "",
  items: [{ variantName: "", importTransactionId: 0, quantity: 1 }],
};

export function InventoryPage() {
  const [tab, setTab] = useState<"IMPORT" | "EXPORT">("IMPORT");
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<InventorySummary[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Summary Filters
  const [sumProductId, setSumProductId] = useState<number | "">("");
  const [sumVariantName, setSumVariantName] = useState("");
  const [sumHasStock, setSumHasStock] = useState(false);
  const [sumHasAvailable, setSumHasAvailable] = useState(false);

  // Transaction Filters
  const [txType, setTxType] = useState("");
  const [txProductId, setTxProductId] = useState<number | "">("");
  const [txVariantName, setTxVariantName] = useState("");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");

  const [importForm, setImportForm] = useState<InventoryImportForm>(emptyImport);
  const [exportForm, setExportForm] = useState<InventoryExportForm>(emptyExport);
  const [lotOptions, setLotOptions] = useState<Record<string, InventoryImportOption[]>>({});
  const [loading, setLoading] = useState(false); // For import/export forms
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmittedImport, setHasSubmittedImport] = useState(false);
  const [hasSubmittedExport, setHasSubmittedExport] = useState(false);

  function validateImport() {
    let schema: Record<string, any> = {
      productId: [minNumber(importForm.productId, 1, "Sản phẩm là bắt buộc")],
    };
    if (importForm.items.length === 0) {
      schema.items = [{ valid: false, message: "Phải có ít nhất 1 phân loại" }];
    } else {
      for (let i = 0; i < importForm.items.length; i++) {
        const item = importForm.items[i];
        schema[`item_${i}_variantName`] = [required(item.variantName, "Phân loại là bắt buộc")];
        schema[`item_${i}_importPrice`] = [minNumber(item.importPrice, 0, "Giá nhập >= 0")];
        schema[`item_${i}_quantity`] = [positiveNumber(item.quantity, "Số lượng > 0")];
      }
    }
    return runValidation(schema);
  }

  function validateExport() {
    let schema: Record<string, any> = {
      productId: [minNumber(exportForm.productId, 1, "Sản phẩm là bắt buộc")],
    };
    if (exportForm.items.length === 0) {
      schema.items = [{ valid: false, message: "Phải có ít nhất 1 phân loại" }];
    } else {
      for (let i = 0; i < exportForm.items.length; i++) {
        const item = exportForm.items[i];
        schema[`item_${i}_variantName`] = [required(item.variantName, "Phân loại là bắt buộc")];
        schema[`item_${i}_importTransactionId`] = [minNumber(item.importTransactionId, 1, "Lô nhập là bắt buộc")];
        schema[`item_${i}_quantity`] = [positiveNumber(item.quantity, "Số lượng > 0")];
      }
    }
    return runValidation(schema);
  }

  const fieldErrors = useMemo(() => {
    if (tab === "IMPORT" && hasSubmittedImport) return validateImport();
    if (tab === "EXPORT" && hasSubmittedExport) return validateExport();
    return {};
  }, [tab, hasSubmittedImport, hasSubmittedExport, importForm, exportForm]);

  const selectedImportProduct = useMemo(() => products.find((item) => item.id === importForm.productId), [products, importForm.productId]);
  const selectedExportProduct = useMemo(() => products.find((item) => item.id === exportForm.productId), [products, exportForm.productId]);

  async function loadProducts() {
    try {
      const result = await catalogService.products({ page: 0, size: 500 });
      setProducts(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadSummary(reset = false) {
    setSummaryLoading(true);
    try {
      const result = await inventoryService.summary({
        page: 0,
        size: 5000,
        productId: reset ? undefined : (sumProductId ? Number(sumProductId) : undefined),
        variantName: reset ? undefined : sumVariantName || undefined,
        hasRemainingStock: reset ? undefined : sumHasStock || undefined,
        hasAvailable: reset ? undefined : sumHasAvailable || undefined,
      });
      setSummary(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadTransactions(reset = false) {
    setTxLoading(true);
    try {
      const result = await inventoryService.transactions({
        page: reset ? 0 : page,
        size: 20,
        type: reset ? undefined : txType || undefined,
        productId: reset ? undefined : (txProductId ? Number(txProductId) : undefined),
        variantName: reset ? undefined : txVariantName || undefined,
        dateFrom: reset ? undefined : txDateFrom || undefined,
        dateTo: reset ? undefined : txDateTo || undefined,
      });
      setTransactions(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTxLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    void loadSummary();
  }, []);

  useEffect(() => {
    void loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function loadLotOptions(index: number, variantName: string) {
    if (!exportForm.productId || !variantName) return;
    try {
      const options = await inventoryService.importOptions(exportForm.productId, variantName);
      setLotOptions((current) => ({ ...current, [`${index}:${variantName}`]: options }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submitImport() {
    setHasSubmittedImport(true);
    const validationErrors = validateImport();
    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng kiểm tra lại thông tin nhập kho");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await inventoryService.importStock(importForm);
      setImportForm(emptyImport);
      void loadSummary();
      if (page === 0) void loadTransactions(); else setPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitExport() {
    setHasSubmittedExport(true);
    const validationErrors = validateExport();
    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng kiểm tra lại thông tin xuất kho");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await inventoryService.exportStock(exportForm);
      setExportForm(emptyExport);
      void loadSummary();
      if (page === 0) void loadTransactions(); else setPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function removeTransaction(id: number) {
    if (!window.confirm("Xóa giao dịch kho này?")) return;
    try {
      await inventoryService.deleteTransaction(id);
      void loadSummary();
      if (page === 0) void loadTransactions(); else setPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleSearchSummary() {
    void loadSummary();
  }

  function handleResetSummary() {
    setSumProductId("");
    setSumVariantName("");
    setSumHasStock(false);
    setSumHasAvailable(false);
    setError(null);
    void loadSummary(true);
  }

  function handleSearchTx() {
    if (page === 0) void loadTransactions();
    else setPage(0);
  }

  function handleResetTx() {
    setTxType("");
    setTxProductId("");
    setTxVariantName("");
    setTxDateFrom("");
    setTxDateTo("");
    setError(null);
    if (page === 0) void loadTransactions(true);
    else setPage(0);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Quản lý Kho</h1>
        <p className="mt-1 text-xs md:text-sm text-gray-500">Quản lý nhập, xuất kho, theo dõi tồn kho và lịch sử giao dịch</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* TOP SECTION: Form with Tabs */}
      <div className="bg-white rounded-2xl shadow-soft-md border border-gray-100 overflow-hidden mb-6">
        <div className="flex p-1.5 bg-gray-100/50 m-4 rounded-xl border border-gray-200/50">
          <button
            type="button"
            onClick={() => { setTab("IMPORT"); setHasSubmittedImport(false); setHasSubmittedExport(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg transition-all focus:outline-none ${tab === "IMPORT" ? "bg-white shadow-soft-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <span className="text-lg">📥</span> Nhập kho
          </button>
          <button
            type="button"
            onClick={() => { setTab("EXPORT"); setHasSubmittedImport(false); setHasSubmittedExport(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg transition-all focus:outline-none ${tab === "EXPORT" ? "bg-white shadow-soft-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <span className="text-lg">📤</span> Xuất kho
          </button>
        </div>

        <div className="p-6 pt-2">
          {tab === "IMPORT" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col md:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 required-label">Sản phẩm</label>
                  <select value={importForm.productId} onChange={(e) => setImportForm({ ...importForm, productId: Number(e.target.value), items: [{ ...importForm.items[0], variantName: "" }] })} className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px] ${fieldErrors.productId ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`}>
                    <option value={0}>Chọn sản phẩm</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {fieldErrors.productId && <div className="text-red-500 text-xs mt-1">{fieldErrors.productId}</div>}
                </div>
                <div className="flex flex-col md:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1">Ngày nhập</label>
                  <DatePicker value={importForm.importDate} onChange={(val) => setImportForm({ ...importForm, importDate: val })} />
                </div>
                <div className="flex flex-col md:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1">Tên file hóa đơn</label>
                  <input placeholder="Tên file hóa đơn" value={importForm.invoiceFile} onChange={(e) => setImportForm({ ...importForm, invoiceFile: e.target.value })} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
                </div>
                <div className="flex flex-col md:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1">Ghi chú thêm</label>
                  <input placeholder="Ghi chú thêm" value={importForm.note} onChange={(e) => setImportForm({ ...importForm, note: e.target.value })} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
                </div>
              </div>
              <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200/50">
                <label className="text-sm font-medium text-gray-700 block mb-2 required-label">Danh sách phân loại nhập</label>
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[550px] space-y-2">
                    {importForm.items.length > 0 && (
                      <div className="flex gap-2 items-center px-1 mb-1">
                        <div className="flex-1 min-w-[200px] text-xs font-semibold text-gray-500 uppercase tracking-wider required-label">Phân loại</div>
                        <div className="w-32 text-xs font-semibold text-gray-500 uppercase tracking-wider required-label">Giá nhập</div>
                        <div className="w-32 text-xs font-semibold text-gray-500 uppercase tracking-wider required-label">Số lượng</div>
                        <div className="w-[34px]"></div>
                      </div>
                    )}
                    {fieldErrors.items && <div className="text-red-500 text-sm mb-2">{fieldErrors.items}</div>}
                    {importForm.items.map((item, index) => (
                      <div key={index} className="flex flex-col gap-1 mb-2">
                        <div className="flex flex-nowrap gap-2 items-start">
                          <div className="flex-1 min-w-[200px]">
                            <select value={item.variantName} onChange={(e) => { const next = [...importForm.items]; next[index] = { ...item, variantName: e.target.value }; setImportForm({ ...importForm, items: next }); }} className={`w-full px-3 py-2 border rounded-lg text-sm h-[38px] ${fieldErrors[`item_${index}_variantName`] ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`}>
                              <option value="">Phân loại</option>
                              {selectedImportProduct?.variants.map((v) => <option key={v.variantName} value={v.variantName}>{v.variantName}</option>)}
                            </select>
                            {fieldErrors[`item_${index}_variantName`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`item_${index}_variantName`]}</div>}
                          </div>
                          <div className="w-32 shrink-0">
                            <NumberInput min={0} placeholder="Giá nhập" value={item.importPrice} onChange={(val) => { const next = [...importForm.items]; next[index] = { ...item, importPrice: val }; setImportForm({ ...importForm, items: next }); }} className={`w-full px-3 py-2 border rounded-lg text-sm h-[38px] ${fieldErrors[`item_${index}_importPrice`] ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`} />
                            {fieldErrors[`item_${index}_importPrice`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`item_${index}_importPrice`]}</div>}
                          </div>
                          <div className="w-32 shrink-0">
                            <NumberInput min={0.000001} allowDecimals placeholder="Số lượng" value={item.quantity} onChange={(val) => { const next = [...importForm.items]; next[index] = { ...item, quantity: val }; setImportForm({ ...importForm, items: next }); }} className={`w-full px-3 py-2 border rounded-lg text-sm h-[38px] ${fieldErrors[`item_${index}_quantity`] ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`} />
                            {fieldErrors[`item_${index}_quantity`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`item_${index}_quantity`]}</div>}
                          </div>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 shrink-0 mt-0.5" onClick={() => setImportForm({ ...importForm, items: importForm.items.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setImportForm({ ...importForm, items: [...importForm.items, { variantName: "", importPrice: 0, quantity: 1 }] })} className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:border-blue-200 transition-colors inline-flex">
                      <Plus size={14} /> Thêm phân loại
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => void submitImport()} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
                  <Save size={16} /> Nhập kho
                </button>
                <button onClick={() => { setImportForm(emptyImport); setHasSubmittedImport(false); setError(null); }} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all">
                  <RefreshCw size={16} /> Làm mới
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col md:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 required-label">Sản phẩm</label>
                  <select value={exportForm.productId} onChange={(e) => setExportForm({ ...exportForm, productId: Number(e.target.value), items: [{ variantName: "", importTransactionId: 0, quantity: 1 }] })} className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px] ${fieldErrors.productId ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`}>
                    <option value={0}>Chọn sản phẩm</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {fieldErrors.productId && <div className="text-red-500 text-xs mt-1">{fieldErrors.productId}</div>}
                </div>
                <div className="flex flex-col md:col-span-1">
                  <label className="text-sm font-medium text-gray-700 mb-1">Ngày xuất</label>
                  <DatePicker value={exportForm.transactionDate} onChange={(val) => setExportForm({ ...exportForm, transactionDate: val })} />
                </div>
                <div className="flex flex-col md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <input placeholder="Ghi chú xuất kho" value={exportForm.note} onChange={(e) => setExportForm({ ...exportForm, note: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]" />
                </div>
              </div>
              <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200/50">
                <label className="text-sm font-medium text-gray-700 block mb-2 required-label">Danh sách phân loại xuất</label>
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[650px] space-y-2">
                    {exportForm.items.length > 0 && (
                      <div className="flex gap-2 items-center px-1 mb-1">
                        <div className="flex-1 min-w-[200px] text-xs font-semibold text-gray-500 uppercase tracking-wider required-label">Phân loại</div>
                        <div className="flex-1 min-w-[200px] text-xs font-semibold text-gray-500 uppercase tracking-wider required-label">Lô nhập</div>
                        <div className="w-32 text-xs font-semibold text-gray-500 uppercase tracking-wider required-label">Số lượng</div>
                        <div className="w-[34px]"></div>
                      </div>
                    )}
                    {fieldErrors.items && <div className="text-red-500 text-sm mb-2">{fieldErrors.items}</div>}
                    {exportForm.items.map((item, index) => {
                      const options = lotOptions[`${index}:${item.variantName}`] ?? [];
                      return (
                        <div key={index} className="flex flex-col gap-1 mb-2">
                          <div className="flex flex-nowrap gap-2 items-start">
                            <div className="flex-1 min-w-[200px]">
                              <select value={item.variantName} onChange={(e) => { const v = e.target.value; const next = [...exportForm.items]; next[index] = { ...item, variantName: v, importTransactionId: 0 }; setExportForm({ ...exportForm, items: next }); void loadLotOptions(index, v); }} className={`w-full px-3 py-2 border rounded-lg text-sm h-[38px] ${fieldErrors[`item_${index}_variantName`] ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`}>
                                <option value="">Phân loại</option>
                                {selectedExportProduct?.variants.map((v) => <option key={v.variantName} value={v.variantName}>{v.variantName}</option>)}
                              </select>
                              {fieldErrors[`item_${index}_variantName`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`item_${index}_variantName`]}</div>}
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <select value={item.importTransactionId} onFocus={() => void loadLotOptions(index, item.variantName)} onChange={(e) => { const next = [...exportForm.items]; next[index] = { ...item, importTransactionId: Number(e.target.value) }; setExportForm({ ...exportForm, items: next }); }} className={`w-full px-3 py-2 border rounded-lg text-sm h-[38px] ${fieldErrors[`item_${index}_importTransactionId`] ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`}>
                                <option value={0}>Chọn lô</option>
                                {options.map((o) => <option key={o.id} value={o.id}>#{o.id} còn {formatNumber(o.sellableQuantity)}</option>)}
                              </select>
                              {fieldErrors[`item_${index}_importTransactionId`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`item_${index}_importTransactionId`]}</div>}
                            </div>
                            <div className="w-32 shrink-0">
                              <NumberInput min={0.000001} allowDecimals placeholder="Số lượng" value={item.quantity} onChange={(val) => { const next = [...exportForm.items]; next[index] = { ...item, quantity: val }; setExportForm({ ...exportForm, items: next }); }} className={`w-full px-3 py-2 border rounded-lg text-sm h-[38px] ${fieldErrors[`item_${index}_quantity`] ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`} />
                              {fieldErrors[`item_${index}_quantity`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`item_${index}_quantity`]}</div>}
                            </div>
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 shrink-0 mt-0.5" onClick={() => setExportForm({ ...exportForm, items: exportForm.items.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => setExportForm({ ...exportForm, items: [...exportForm.items, { variantName: "", importTransactionId: 0, quantity: 1 }] })} className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:border-blue-200 transition-colors inline-flex">
                      <Plus size={14} /> Thêm phân loại
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => void submitExport()} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
                  <Save size={16} /> Xuất kho
                </button>
                <button onClick={() => { setExportForm(emptyExport); setHasSubmittedExport(false); setError(null); }} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all">
                  <RefreshCw size={16} /> Làm mới
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INVENTORY SUMMARY SECTION */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-soft-md mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-bold text-gray-900">Tổng hợp tồn kho</h3>
        </div>
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Sản phẩm</label>
            <select value={sumProductId} onChange={(e) => setSumProductId(e.target.value ? Number(e.target.value) : "")} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
              <option value="">Tất cả sản phẩm</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* <div className="flex flex-col flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Phân loại</label>
              <input type="text" placeholder="Tất cả phân loại" value={sumVariantName} onChange={(e) => setSumVariantName(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
            </div> */}
          <div className="flex items-center gap-4 flex-1 min-w-[200px] h-[38px]">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={sumHasStock} onChange={(e) => setSumHasStock(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
              Còn tồn kho
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={sumHasAvailable} onChange={(e) => setSumHasAvailable(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
              Còn khả dụng
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearchSummary} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 whitespace-nowrap">
              <Search size={16} /> Tìm kiếm
            </button>
            <button onClick={handleResetSummary} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all whitespace-nowrap">
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </div>
        <DataState loading={summaryLoading}>
          <div className="overflow-x-auto">
            {summary.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                <Box size={48} className="text-gray-300 mb-4" />
                <p>Chưa có dữ liệu tồn kho đáp ứng điều kiện tìm kiếm.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Sản phẩm</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Phân loại</th>
                    <th className="px-6 py-3 text-right font-bold text-gray-700 uppercase tracking-wider text-xs">Giá nhập TB</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Tổng nhập</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Tổng xuất</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Tồn hiện tại</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Chờ giao</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Đã giao</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Khả dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {summary.map((item) => (
                    <tr key={`${item.productId}-${item.variantName}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.productName}</td>
                      <td className="px-6 py-4"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">{item.variantName}</span></td>
                      <td className="px-6 py-4 text-right font-medium text-gray-600">{formatMoney(item.averageImportPrice)}</td>
                      <td className="px-6 py-4 text-center font-medium text-blue-600">{formatNumber(item.totalImported)}</td>
                      <td className="px-6 py-4 text-center font-medium text-orange-600">{formatNumber(item.totalExported)}</td>
                      <td className="px-6 py-4 text-center font-medium text-gray-900">{formatNumber(item.currentStock)}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{formatNumber(item.pendingOrderQuantity)}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{formatNumber(item.shippedOrderQuantity)}</td>
                      <td className="px-6 py-4 text-center font-semibold text-emerald-600">{formatNumber(item.availableAfterPending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DataState>
      </div>

      {/* TRANSACTIONS SECTION */}
      <div className="bg-white rounded-2xl shadow-soft-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-bold text-gray-900">Lịch sử giao dịch kho</h3>
        </div>
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Loại giao dịch</label>
            <select value={txType} onChange={(e) => setTxType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
              <option value="">Tất cả loại</option>
              <option value="IMPORT">Nhập kho</option>
              <option value="EXPORT">Xuất kho</option>
            </select>
          </div>
          <div className="flex flex-col flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Sản phẩm</label>
            <select value={txProductId} onChange={(e) => setTxProductId(e.target.value ? Number(e.target.value) : "")} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
              <option value="">Tất cả sản phẩm</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* <div className="flex flex-col flex-1 min-w-[150px]">
              <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Phân loại</label>
              <input type="text" placeholder="Tất cả phân loại" value={txVariantName} onChange={(e) => setTxVariantName(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />
            </div> */}
          <div className="flex flex-col flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Từ ngày</label>
            <DatePicker value={txDateFrom} onChange={(val) => setTxDateFrom(val)} />
          </div>
          <div className="flex flex-col flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Đến ngày</label>
            <DatePicker value={txDateTo} onChange={(val) => setTxDateTo(val)} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearchTx} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 whitespace-nowrap">
              <Search size={16} /> Tìm kiếm
            </button>
            <button onClick={handleResetTx} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all whitespace-nowrap">
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </div>
        <DataState loading={txLoading}>
          <div className="overflow-x-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                <Activity size={48} className="text-gray-300 mb-4" />
                <p>Không có lịch sử giao dịch kho nào.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">ID</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Sản phẩm</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Phân loại</th>
                    <th className="px-6 py-3 text-right font-bold text-gray-700 uppercase tracking-wider text-xs">Giá nhập</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Số lượng</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Loại</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Nguồn</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Ngày</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">File hóa đơn</th>
                    <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider text-xs">Ghi chú</th>
                    <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider text-xs">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{tx.id}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{tx.productName}</td>
                      <td className="px-6 py-4 text-gray-600">{tx.variantName || "-"}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{tx.importPrice != null ? formatMoney(tx.importPrice) : "-"}</td>
                      <td className="px-6 py-4 text-center font-semibold">{formatNumber(tx.quantity)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${tx.type === "IMPORT" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                          {tx.type === "IMPORT" ? "Nhập" : "Xuất"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{tx.source === "ORDER" ? "Đơn hàng" : tx.source === "ORDER_CANCEL" ? "Hoàn kho" : tx.source === "MANUAL" ? "Thủ công" : "Khác"}</td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(tx.transactionDate)}</td>
                      <td className="px-6 py-4 text-blue-600 truncate max-w-[150px]">{tx.invoiceFile || "-"}</td>
                      <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]" title={tx.note || ""}>{tx.note || "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => void removeTransaction(tx.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {transactions.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
          </div>
        </DataState>
      </div>
    </div>
  );
}
