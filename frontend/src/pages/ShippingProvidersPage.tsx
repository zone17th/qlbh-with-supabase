import { Trash2, Search, Save, RefreshCw, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { DataState } from "../components/DataState";
import { Pagination } from "../components/Pagination";
import { shippingService } from "../services/shippingService";
import type { ShippingProvider } from "../types/models";
import type { ShippingProviderForm } from "../types/forms";
import { required, runValidation } from "../utils/validation";

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
  const [hasSubmitted, setHasSubmitted] = useState(false);

  function validate() {
    let schema: Record<string, any> = {
      providerName: [required(form.providerName, "Tên đơn vị giao hàng là bắt buộc")],
    };
    if (form.shippers.length === 0) {
      schema.shippers = [{ valid: false, message: "Phải có ít nhất 1 shipper hợp lệ" }];
    } else {
      for (let i = 0; i < form.shippers.length; i++) {
        const shipper = form.shippers[i];
        schema[`shipper_${i}_name`] = [required(shipper.shipperName, "Tên shipper là bắt buộc")];
        schema[`shipper_${i}_phone`] = [required(shipper.shipperPhone, "SĐT là bắt buộc")];
      }
    }
    return runValidation(schema);
  }

  const fieldErrors = hasSubmitted ? validate() : {};

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
    setHasSubmitted(true);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng kiểm tra lại thông tin");
      return;
    }
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
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Đơn vị giao hàng</h1>
        <p className="mt-1 text-xs md:text-sm text-gray-500">Đơn vị giao hàng và danh sách shipper.</p>
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
          <button onClick={() => void load()} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 whitespace-nowrap">
            <Search size={16} /> Tìm kiếm
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <DataState loading={loading} error={null} empty={false}>
        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.4fr] gap-6">
          {/* Form */}
          <div className="bg-white rounded-2xl shadow-soft-md border border-gray-100 p-6 min-w-0">
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
                  className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px] ${fieldErrors.providerName ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`}
                />
                {fieldErrors.providerName && <div className="text-red-500 text-xs mt-1">{fieldErrors.providerName}</div>}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 required-label">Shipper</label>
                  <button
                    onClick={() => setForm({ ...form, shippers: [...form.shippers, { shipperName: "", shipperPhone: "" }] })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  >
                    <Plus size={14} /> Thêm shipper
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
                  {fieldErrors.shippers && <div className="text-red-500 text-sm mb-2">{fieldErrors.shippers}</div>}
                  {form.shippers.map((shipper, index) => (
                    <div key={index} className="flex flex-col gap-1 mb-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <input
                            placeholder="Tên shipper"
                            value={shipper.shipperName}
                            onChange={(e) => { const next = [...form.shippers]; next[index] = { ...shipper, shipperName: e.target.value }; setForm({ ...form, shippers: next }); }}
                            className={`w-full min-w-0 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px] ${fieldErrors[`shipper_${index}_name`] ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`}
                          />
                          {fieldErrors[`shipper_${index}_name`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`shipper_${index}_name`]}</div>}
                        </div>
                        <div className="flex-1">
                          <input
                            placeholder="Số điện thoại"
                            value={shipper.shipperPhone}
                            onChange={(e) => { const next = [...form.shippers]; next[index] = { ...shipper, shipperPhone: e.target.value }; setForm({ ...form, shippers: next }); }}
                            className={`w-full min-w-0 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px] ${fieldErrors[`shipper_${index}_phone`] ? "border-red-400 focus:ring-red-500" : "border-gray-300"}`}
                          />
                          {fieldErrors[`shipper_${index}_phone`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`shipper_${index}_phone`]}</div>}
                        </div>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 shrink-0 mt-0.5"
                          onClick={() => setForm({ ...form, shippers: form.shippers.filter((_, i) => i !== index) })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => void submit()} className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 whitespace-nowrap">
                  <Save size={16} /> {form.id ? "Cập nhật đơn vị" : "Tạo đơn vị"}
                </button>
                <button onClick={() => setForm(emptyForm)} className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all whitespace-nowrap">
                  <RefreshCw size={16} /> Làm mới
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-soft-sm min-w-0">
            <table className="min-w-[600px] w-full text-sm">
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
                        <button onClick={() => void remove(provider.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
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
