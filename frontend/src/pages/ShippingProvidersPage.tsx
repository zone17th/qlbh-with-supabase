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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Đơn vị giao hàng</h1>
            <p className="text-gray-600 mt-2">Đơn vị giao hàng và danh sách shipper.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-soft-md p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void load()}
              placeholder="Tên đơn vị..."
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={() => void load()} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            🔍 Tìm kiếm
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <DataState loading={loading} error={null} empty={false}>
        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.4fr] gap-6">
          {/* Form */}
          <div className="bg-white rounded-2xl shadow-soft-md border border-gray-100 p-6">
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{form.id ? "Cập nhật đơn vị giao hàng" : "Tạo đơn vị giao hàng mới"}</h2>
              <p className="text-gray-600 text-sm mt-1">Thông tin đơn vị giao hàng và shipper</p>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2 required-label">Tên đơn vị giao hàng</label>
                <input
                  value={form.providerName}
                  onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                  placeholder="Nhập tên đơn vị giao hàng..."
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 required-label">Shipper</label>
                  <button
                    onClick={() => setForm({ ...form, shippers: [...form.shippers, { shipperName: "", shipperPhone: "" }] })}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    + Thêm shipper
                  </button>
                </div>
                <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200/50">
                  {form.shippers.length > 0 && (
                    <div className="hidden md:flex gap-2 items-center px-1 mb-1">
                      <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên shipper</div>
                      <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Số điện thoại</div>
                      <div className="w-[34px]"></div>
                    </div>
                  )}
                  {form.shippers.map((shipper, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        placeholder="Tên shipper"
                        value={shipper.shipperName}
                        onChange={(e) => { const next = [...form.shippers]; next[index] = { ...shipper, shipperName: e.target.value }; setForm({ ...form, shippers: next }); }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]"
                      />
                      <input
                        placeholder="Số điện thoại"
                        value={shipper.shipperPhone}
                        onChange={(e) => { const next = [...form.shippers]; next[index] = { ...shipper, shipperPhone: e.target.value }; setForm({ ...form, shippers: next }); }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]"
                      />
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors"
                        disabled={form.shippers.length === 1}
                        onClick={() => setForm({ ...form, shippers: form.shippers.filter((_, i) => i !== index) })}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => void submit()} className="px-6 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-all shadow-soft-md">
                  {form.id ? "✓ Cập nhật đơn vị giao hàng" : "✓ Tạo đơn vị giao hàng"}
                </button>
                <button onClick={() => setForm(emptyForm)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all">
                  Làm mới
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-soft-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Đơn vị giao hàng</th>
                  <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Shipper</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{provider.providerName}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {provider.shippers.map((shipper) => (
                          <span key={shipper.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">
                            {shipper.shipperName} ({shipper.shipperPhone})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => edit(provider)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">✏️</button>
                        <button onClick={() => void remove(provider.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </DataState>
    </div>
  );
}
