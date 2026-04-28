import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataState } from "../components/DataState";
import { Pagination } from "../components/Pagination";
import { catalogService } from "../services/catalogService";
import { inventoryService } from "../services/inventoryService";
import type { InventoryImportOption, InventorySummary, InventoryTransaction, Product } from "../types/models";
import type { InventoryExportForm, InventoryImportForm } from "../types/forms";
import { todayIsoDate } from "../utils/date";
import { formatMoney, formatNumber } from "../utils/format";
import { firstError, minNumber, positiveNumber, required } from "../utils/validation";

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
  const [filterType, setFilterType] = useState("");
  const [importForm, setImportForm] = useState<InventoryImportForm>(emptyImport);
  const [exportForm, setExportForm] = useState<InventoryExportForm>(emptyExport);
  const [lotOptions, setLotOptions] = useState<Record<string, InventoryImportOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedImportProduct = useMemo(() => products.find((item) => item.id === importForm.productId), [products, importForm.productId]);
  const selectedExportProduct = useMemo(() => products.find((item) => item.id === exportForm.productId), [products, exportForm.productId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [productResult, summaryResult, txResult] = await Promise.all([
        catalogService.products({ page: 0, size: 500 }),
        inventoryService.summary({ page: 0, size: 5000 }),
        inventoryService.transactions({ page, size: 20, type: filterType }),
      ]);
      setProducts(productResult.items);
      setSummary(summaryResult.items);
      setTransactions(txResult.items);
      setTotalPages(txResult.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, filterType]);

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
    const validation = firstError([
      minNumber(importForm.productId, 1, "Sản phẩm là bắt buộc"),
      required(importForm.items[0]?.variantName, "Tên phân loại là bắt buộc"),
      minNumber(importForm.items[0]?.importPrice ?? -1, 0, "Giá nhập phải >= 0"),
      positiveNumber(importForm.items[0]?.quantity ?? 0, "Số lượng phải > 0"),
    ]);
    if (validation) return setError(validation);
    setLoading(true);
    setError(null);
    try {
      await inventoryService.importStock(importForm);
      setImportForm(emptyImport);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitExport() {
    const first = exportForm.items[0];
    const validation = firstError([
      minNumber(exportForm.productId, 1, "Sản phẩm là bắt buộc"),
      required(first?.variantName, "Tên phân loại là bắt buộc"),
      minNumber(first?.importTransactionId ?? 0, 1, "Lô nhập là bắt buộc"),
      positiveNumber(first?.quantity ?? 0, "Số lượng phải > 0"),
    ]);
    if (validation) return setError(validation);
    setLoading(true);
    setError(null);
    try {
      await inventoryService.exportStock(exportForm);
      setExportForm(emptyExport);
      await load();
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Kho</h1>
          <p>Nhập kho, xuất kho thủ công, tồn kho và giao dịch.</p>
        </div>
        <div className="toolbar">
          <label className="field"><span>Loại giao dịch</span><select value={filterType} onChange={(event) => setFilterType(event.target.value)}><option value="">Tất cả</option><option value="IMPORT">Nhập</option><option value="EXPORT">Xuất</option></select></label>
        </div>
      </div>

      <DataState loading={loading} error={error} empty={false}>
        <div className="tabs">
          <button className={tab === "IMPORT" ? "active" : ""} onClick={() => setTab("IMPORT")}>Nhập kho</button>
          <button className={tab === "EXPORT" ? "active" : ""} onClick={() => setTab("EXPORT")}>Xuất kho</button>
        </div>

        <div className="grid two">
          <section className="form-panel">
            {tab === "IMPORT" ? (
              <>
                <h2>Nhập kho</h2>
                <div className="form-grid">
                  <label className="field"><span>Sản phẩm</span><select value={importForm.productId} onChange={(event) => setImportForm({ ...importForm, productId: Number(event.target.value), items: [{ ...importForm.items[0], variantName: "" }] })}><option value={0}>Chọn sản phẩm</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                  <label className="field"><span>Ngày nhập</span><input type="date" value={importForm.importDate} onChange={(event) => setImportForm({ ...importForm, importDate: event.target.value })} /></label>
                  <label className="field full"><span>Invoice file</span><input value={importForm.invoiceFile} onChange={(event) => setImportForm({ ...importForm, invoiceFile: event.target.value })} /></label>
                  <label className="field full"><span>Ghi chú</span><textarea value={importForm.note} onChange={(event) => setImportForm({ ...importForm, note: event.target.value })} /></label>
                </div>
                <div className="inline-list">
                  {importForm.items.map((item, index) => (
                    <div className="inline-row" key={index}>
                      <select value={item.variantName} onChange={(event) => {
                        const next = [...importForm.items];
                        next[index] = { ...item, variantName: event.target.value };
                        setImportForm({ ...importForm, items: next });
                      }}><option value="">Phân loại</option>{selectedImportProduct?.variants.map((variant) => <option key={variant.variantName} value={variant.variantName}>{variant.variantName}</option>)}</select>
                      <input type="number" min={0} value={item.importPrice} onChange={(event) => {
                        const next = [...importForm.items];
                        next[index] = { ...item, importPrice: Number(event.target.value) };
                        setImportForm({ ...importForm, items: next });
                      }} />
                      <input type="number" min={0.000001} step={0.000001} value={item.quantity} onChange={(event) => {
                        const next = [...importForm.items];
                        next[index] = { ...item, quantity: Number(event.target.value) };
                        setImportForm({ ...importForm, items: next });
                      }} />
                      <button className="ghost" onClick={() => setImportForm({ ...importForm, items: importForm.items.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button className="secondary" onClick={() => setImportForm({ ...importForm, items: [...importForm.items, { variantName: "", importPrice: 0, quantity: 1 }] })}><Plus size={16} /> Thêm dòng</button>
                </div>
                <button className="primary" onClick={() => void submitImport()}><Save size={16} /> Lưu nhập kho</button>
              </>
            ) : (
              <>
                <h2>Xuất kho thủ công</h2>
                <div className="form-grid">
                  <label className="field"><span>Sản phẩm</span><select value={exportForm.productId} onChange={(event) => setExportForm({ ...exportForm, productId: Number(event.target.value), items: [{ variantName: "", importTransactionId: 0, quantity: 1 }] })}><option value={0}>Chọn sản phẩm</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                  <label className="field"><span>Ngày xuất</span><input type="date" value={exportForm.transactionDate} onChange={(event) => setExportForm({ ...exportForm, transactionDate: event.target.value })} /></label>
                  <label className="field full"><span>Ghi chú</span><textarea value={exportForm.note} onChange={(event) => setExportForm({ ...exportForm, note: event.target.value })} /></label>
                </div>
                <div className="inline-list">
                  {exportForm.items.map((item, index) => {
                    const options = lotOptions[`${index}:${item.variantName}`] ?? [];
                    return (
                      <div className="inline-row" key={index}>
                        <select value={item.variantName} onChange={(event) => {
                          const variantName = event.target.value;
                          const next = [...exportForm.items];
                          next[index] = { ...item, variantName, importTransactionId: 0 };
                          setExportForm({ ...exportForm, items: next });
                          void loadLotOptions(index, variantName);
                        }}><option value="">Phân loại</option>{selectedExportProduct?.variants.map((variant) => <option key={variant.variantName} value={variant.variantName}>{variant.variantName}</option>)}</select>
                        <select value={item.importTransactionId} onFocus={() => void loadLotOptions(index, item.variantName)} onChange={(event) => {
                          const next = [...exportForm.items];
                          next[index] = { ...item, importTransactionId: Number(event.target.value) };
                          setExportForm({ ...exportForm, items: next });
                        }}><option value={0}>Chọn lô</option>{options.map((option) => <option key={option.id} value={option.id}>#{option.id} còn {formatNumber(option.sellableQuantity)}</option>)}</select>
                        <input type="number" min={0.000001} step={0.000001} value={item.quantity} onChange={(event) => {
                          const next = [...exportForm.items];
                          next[index] = { ...item, quantity: Number(event.target.value) };
                          setExportForm({ ...exportForm, items: next });
                        }} />
                        <button className="ghost" onClick={() => setExportForm({ ...exportForm, items: exportForm.items.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
                      </div>
                    );
                  })}
                  <button className="secondary" onClick={() => setExportForm({ ...exportForm, items: [...exportForm.items, { variantName: "", importTransactionId: 0, quantity: 1 }] })}><Plus size={16} /> Thêm dòng</button>
                </div>
                <button className="primary" onClick={() => void submitExport()}><Save size={16} /> Lưu xuất kho</button>
              </>
            )}
          </section>

          <section className="section">
            <h2>Tồn kho</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Sản phẩm</th><th>Phân loại</th><th>Tồn</th><th>Đang giữ</th><th>Khả dụng</th><th>Giá nhập TB</th></tr></thead>
                <tbody>{summary.map((item) => <tr key={`${item.productId}-${item.variantName}`}><td>{item.productName}</td><td>{item.variantName}</td><td>{formatNumber(item.currentStock)}</td><td>{formatNumber(item.pendingOrderQuantity)}</td><td>{formatNumber(item.availableAfterPending)}</td><td>{formatMoney(item.averageImportPrice)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="section">
          <h2>Giao dịch kho</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Ngày</th><th>Sản phẩm</th><th>Loại</th><th>Nguồn</th><th>SL</th><th>Lô</th><th></th></tr></thead>
              <tbody>
                {transactions.map((tx) => <tr key={tx.id}><td>{tx.id}</td><td>{tx.transactionDate}</td><td>{tx.productName} / {tx.variantName}</td><td>{tx.type}</td><td>{tx.source}</td><td>{formatNumber(tx.quantity)}</td><td>{tx.batchCode ?? tx.importTransactionId}</td><td><button className="danger" onClick={() => void removeTransaction(tx.id)}>Xóa</button></td></tr>)}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </section>
      </DataState>
    </>
  );
}
