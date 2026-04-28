import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DataState } from "../components/DataState";
import { Pagination } from "../components/Pagination";
import { shippingService } from "../services/shippingService";
import type { ShippingProvider } from "../types/models";
import type { ShippingProviderForm } from "../types/forms";
import { firstError, required } from "../utils/validation";

const emptyForm: ShippingProviderForm = {
  providerName: "",
  shippers: [{ shipperName: "", shipperPhone: "" }],
};

export function ShippingProvidersPage() {
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [form, setForm] = useState<ShippingProviderForm>(emptyForm);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await shippingService.list({ page, size: 20, keyword });
      setProviders(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  async function submit() {
    const validation = firstError([
      required(form.providerName, "Tên đơn vị giao hàng là bắt buộc"),
      form.shippers.some((shipper) => shipper.shipperName.trim() && shipper.shipperPhone.trim())
        ? { valid: true }
        : { valid: false, message: "Phải có ít nhất 1 shipper hợp lệ" },
    ]);
    if (validation) return setError(validation);
    setLoading(true);
    setError(null);
    try {
      if (form.id) await shippingService.update(form);
      else await shippingService.create(form);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Xóa đơn vị giao hàng này?")) return;
    try {
      await shippingService.delete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function edit(provider: ShippingProvider) {
    setForm({
      id: provider.id,
      providerName: provider.providerName,
      shippers: provider.shippers.map((shipper) => ({
        id: shipper.id,
        shipperName: shipper.shipperName,
        shipperPhone: shipper.shipperPhone,
      })),
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Đơn vị giao hàng</h1>
          <p>Provider và danh sách shipper được dùng khi chuyển đơn sang đang giao.</p>
        </div>
        <div className="toolbar">
          <label className="field"><span>Tìm kiếm</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} /></label>
          <button className="secondary" onClick={() => void load()}>Tìm</button>
        </div>
      </div>

      <DataState loading={loading} error={error} empty={false}>
        <div className="grid two">
          <section className="form-panel">
            <h2>{form.id ? "Cập nhật provider" : "Tạo provider"}</h2>
            <div className="form-grid">
              <label className="field full"><span>Tên provider</span><input value={form.providerName} onChange={(event) => setForm({ ...form, providerName: event.target.value })} /></label>
            </div>
            <div className="inline-list">
              <strong>Shipper</strong>
              {form.shippers.map((shipper, index) => (
                <div className="inline-row" key={index}>
                  <input placeholder="Tên shipper" value={shipper.shipperName} onChange={(event) => {
                    const next = [...form.shippers];
                    next[index] = { ...shipper, shipperName: event.target.value };
                    setForm({ ...form, shippers: next });
                  }} />
                  <input placeholder="Số điện thoại" value={shipper.shipperPhone} onChange={(event) => {
                    const next = [...form.shippers];
                    next[index] = { ...shipper, shipperPhone: event.target.value };
                    setForm({ ...form, shippers: next });
                  }} />
                  <button className="ghost" onClick={() => setForm({ ...form, shippers: form.shippers.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
                </div>
              ))}
              <button className="secondary" onClick={() => setForm({ ...form, shippers: [...form.shippers, { shipperName: "", shipperPhone: "" }] })}><Plus size={16} /> Thêm shipper</button>
            </div>
            <div className="toolbar">
              <button className="primary" onClick={() => void submit()}><Save size={16} /> Lưu</button>
              <button className="ghost" onClick={() => setForm(emptyForm)}>Làm mới</button>
            </div>
          </section>

          <section className="section">
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Provider</th><th>Shipper</th><th></th></tr></thead>
                <tbody>
                  {providers.map((provider) => (
                    <tr key={provider.id}>
                      <td>{provider.id}</td>
                      <td>{provider.providerName}</td>
                      <td>{provider.shippers.map((shipper) => `${shipper.shipperName} (${shipper.shipperPhone})`).join(", ")}</td>
                      <td><div className="row-actions"><button className="secondary" onClick={() => edit(provider)}>Sửa</button><button className="danger" onClick={() => void remove(provider.id)}>Xóa</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </section>
        </div>
      </DataState>
    </>
  );
}
