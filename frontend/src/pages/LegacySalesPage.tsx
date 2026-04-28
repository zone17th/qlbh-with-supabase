import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { DataState } from "../components/DataState";
import { salesService } from "../services/salesService";
import type { SaleRecord } from "../types/models";
import { todayIsoDate } from "../utils/date";
import { formatMoney } from "../utils/format";

const emptyForm: Partial<SaleRecord> = {
  productName: "",
  importDate: todayIsoDate(),
  importPrice: 0,
  salePrice: 0,
  shippingFee: 0,
  saleDate: todayIsoDate(),
  note: "",
};

export function LegacySalesPage() {
  const [rows, setRows] = useState<SaleRecord[]>([]);
  const [form, setForm] = useState<Partial<SaleRecord>>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await salesService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      if (form.id) await salesService.update(form as Partial<SaleRecord> & { id: number });
      else await salesService.create(form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Xóa bản ghi bán hàng legacy này?")) return;
    try {
      await salesService.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Legacy sale records</h1>
          <p>API CRUD cũ `/api/v1/sales`, frontend gốc không dùng trực tiếp.</p>
        </div>
      </div>
      <DataState loading={loading} error={error} empty={false}>
        <div className="grid two">
          <section className="form-panel">
            <h2>{form.id ? "Cập nhật bản ghi" : "Tạo bản ghi"}</h2>
            <div className="form-grid">
              <label className="field"><span>Sản phẩm</span><input value={form.productName ?? ""} onChange={(event) => setForm({ ...form, productName: event.target.value })} /></label>
              <label className="field"><span>Ngày nhập</span><input type="date" value={form.importDate ?? ""} onChange={(event) => setForm({ ...form, importDate: event.target.value })} /></label>
              <label className="field"><span>Giá nhập</span><input type="number" value={form.importPrice ?? 0} onChange={(event) => setForm({ ...form, importPrice: Number(event.target.value) })} /></label>
              <label className="field"><span>Giá bán</span><input type="number" value={form.salePrice ?? 0} onChange={(event) => setForm({ ...form, salePrice: Number(event.target.value) })} /></label>
              <label className="field"><span>Phí ship</span><input type="number" value={form.shippingFee ?? 0} onChange={(event) => setForm({ ...form, shippingFee: Number(event.target.value) })} /></label>
              <label className="field"><span>Ngày bán</span><input type="date" value={form.saleDate ?? ""} onChange={(event) => setForm({ ...form, saleDate: event.target.value })} /></label>
              <label className="field full"><span>Ghi chú</span><textarea value={form.note ?? ""} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
            </div>
            <div className="toolbar">
              <button className="primary" onClick={() => void submit()}><Save size={16} /> Lưu</button>
              <button className="ghost" onClick={() => setForm(emptyForm)}>Làm mới</button>
            </div>
          </section>
          <section className="section">
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Sản phẩm</th><th>Ngày bán</th><th>Doanh thu ước tính</th><th></th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.productName}</td><td>{row.saleDate}</td><td>{formatMoney(row.estimatedRevenue)}</td><td><div className="row-actions"><button className="secondary" onClick={() => setForm(row)}>Sửa</button><button className="danger" onClick={() => void remove(row.id)}>Xóa</button></div></td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </div>
      </DataState>
    </>
  );
}
