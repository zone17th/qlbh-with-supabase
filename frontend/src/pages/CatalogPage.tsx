import { Plus, Save, Trash2, Search, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataState } from "../components/DataState";
import { NumberInput } from "../components/NumberInput";
import { Pagination } from "../components/Pagination";
import { catalogService } from "../services/catalogService";
import type { Product, ProductCategory } from "../types/models";
import type { CategoryForm, ProductForm } from "../types/forms";
import { minNumber, required, runValidation } from "../utils/validation";

const emptyProduct: ProductForm = {
  name: "",
  categoryId: 0,
  warrantyMonths: 24,
  note: "",
  variants: [{ variantName: "" }],
};

const emptyCategory: CategoryForm = { name: "", description: "" };

export function CatalogPage() {
  const [tab, setTab] = useState<"PRODUCT" | "CATEGORY">("PRODUCT");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ProductCategory[]>([]);
  const [productPage, setProductPage] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(0);
  const [categoryTotalPages, setCategoryTotalPages] = useState(0);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [keyword, setKeyword] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState(0);
  const [loading, setLoading] = useState(false); // For forms
  const [productLoading, setProductLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmittedProduct, setHasSubmittedProduct] = useState(false);
  const [hasSubmittedCategory, setHasSubmittedCategory] = useState(false);

  function validateProduct() {
    let schema: Record<string, any> = {
      name: [required(productForm.name, "Tên sản phẩm là bắt buộc")],
      categoryId: [minNumber(productForm.categoryId, 1, "Danh mục là bắt buộc")],
      warrantyMonths: [minNumber(productForm.warrantyMonths, 1, "Số tháng bảo hành phải lớn hơn 0")],
    };
    if (productForm.variants.length === 0) {
      schema.variants = [{ valid: false, message: "Phải có ít nhất 1 phân loại" }];
    } else {
      for (let i = 0; i < productForm.variants.length; i++) {
        schema[`variant_${i}_name`] = [required(productForm.variants[i].variantName, "Tên phân loại là bắt buộc")];
      }
    }
    return runValidation(schema);
  }

  function validateCategory() {
    return runValidation({
      name: [required(categoryForm.name, "Tên danh mục là bắt buộc")],
    });
  }

  const fieldErrors = useMemo(() => {
    if (tab === "PRODUCT" && hasSubmittedProduct) return validateProduct();
    if (tab === "CATEGORY" && hasSubmittedCategory) return validateCategory();
    return {};
  }, [tab, hasSubmittedProduct, hasSubmittedCategory, productForm, categoryForm]);

  async function loadCategoryOptions() {
    try {
      const result = await catalogService.categories({ page: 0, size: 500 });
      setCategoryOptions(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadProducts(reset = false) {
    setProductLoading(true);
    setError(null);
    try {
      const result = await catalogService.products({ 
        page: reset ? 0 : productPage, 
        size: 20, 
        name: reset ? "" : keyword, 
        categoryId: reset ? undefined : (filterCategoryId || undefined) 
      });
      setProducts(result.items);
      setProductTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProductLoading(false);
    }
  }

  async function loadCategories() {
    setCategoryLoading(true);
    setError(null);
    try {
      const result = await catalogService.categories({ page: categoryPage, size: 20 });
      setCategories(result.items);
      setCategoryTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCategoryLoading(false);
    }
  }

  useEffect(() => {
    void loadCategoryOptions();
  }, []);

  useEffect(() => {
    if (tab === "PRODUCT") void loadProducts();
    else void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productPage, categoryPage, tab]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function submitProduct() {
    setHasSubmittedProduct(true);
    const validationErrors = validateProduct();
    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng kiểm tra lại thông tin");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (productForm.id) await catalogService.updateProduct(productForm);
      else await catalogService.createProduct(productForm);
      setProductForm(emptyProduct);
      void loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitCategory() {
    setHasSubmittedCategory(true);
    const validationErrors = validateCategory();
    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng kiểm tra lại thông tin");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (categoryForm.id) await catalogService.updateCategory(categoryForm);
      else await catalogService.createCategory(categoryForm);
      setCategoryForm(emptyCategory);
      void loadCategories();
      void loadCategoryOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function editProduct(product: Product) {
    setTab("PRODUCT");
    setProductForm({
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      warrantyMonths: product.warrantyMonths,
      note: product.note ?? "",
      variants: product.variants.map((variant) => ({ id: variant.id, variantName: variant.variantName })),
    });
  }

  function editCategory(category: ProductCategory) {
    setTab("CATEGORY");
    setCategoryForm({ id: category.id, name: category.name, description: category.description ?? "" });
  }

  async function removeProduct(id: number) {
    if (!window.confirm("Xóa sản phẩm này?")) return;
    try {
      await catalogService.deleteProduct(id);
      void loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeCategory(id: number) {
    if (!window.confirm("Xóa danh mục này?")) return;
    try {
      await catalogService.deleteCategory(id);
      void loadCategories();
      void loadCategoryOptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">Quản lý Sản phẩm & Danh mục</h1>
        <p className="mt-1 text-xs md:text-sm text-muted">Quản lý danh mục sản phẩm, thông tin sản phẩm và phân loại</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Tabs Card */}
      <div className="bg-white rounded-2xl shadow-soft-md border border-divider overflow-hidden">
        {/* Segmented Tabs */}
        <div className="flex p-1.5 bg-brand-100/30 m-4 rounded-xl border border-divider/50">
          <button
            type="button"
            onClick={() => { setTab("PRODUCT"); setHasSubmittedProduct(false); setHasSubmittedCategory(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg transition-all focus:outline-none ${
              tab === "PRODUCT"
                ? "bg-white shadow-soft-sm text-brand-600"
                : "text-muted hover:text-ink/80"
            }`}
          >
            <span className="text-lg">📦</span> Sản phẩm
          </button>
          <button
            type="button"
            onClick={() => { setTab("CATEGORY"); setHasSubmittedProduct(false); setHasSubmittedCategory(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg transition-all focus:outline-none ${
              tab === "CATEGORY"
                ? "bg-white shadow-soft-sm text-brand-600"
                : "text-muted hover:text-ink/80"
            }`}
          >
            <span className="text-lg">🏷️</span> Danh mục
          </button>
        </div>

        <div className="p-6 pt-2">
            {tab === "PRODUCT" ? (
              <div className="space-y-8">
                {/* Product Form Section */}
                <div className="bg-white rounded-lg shadow-soft-md p-6 mb-6">
                  <div className="mb-6 pb-4 border-b border-divider">
                    <h2 className="text-xl font-semibold text-ink">
                      {productForm.id ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
                    </h2>
                    <p className="text-muted text-sm mt-1">Quản lý thông tin và các phiên bản sản phẩm</p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-ink/80 mb-2 required-label">Tên sản phẩm</label>
                        <input
                          type="text"
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          placeholder="Nhập tên sản phẩm"
                          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors h-[38px] ${fieldErrors.name ? "border-red-400 focus:ring-red-500" : "border-divider"}`}
                        />
                        {fieldErrors.name && <div className="text-red-500 text-xs mt-1">{fieldErrors.name}</div>}
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-ink/80 mb-2 required-label">Danh mục</label>
                        <select
                          value={productForm.categoryId}
                          onChange={(e) => setProductForm({ ...productForm, categoryId: Number(e.target.value) })}
                          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors h-[38px] ${fieldErrors.categoryId ? "border-red-400 focus:ring-red-500" : "border-divider"}`}
                        >
                          <option value={0}>Chọn danh mục</option>
                          {categoryOptions.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        {fieldErrors.categoryId && <div className="text-red-500 text-xs mt-1">{fieldErrors.categoryId}</div>}
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-ink/80 mb-2 required-label">Bảo hành (tháng)</label>
                        <NumberInput
                          min={1}
                          value={productForm.warrantyMonths}
                          onChange={(val) => setProductForm({ ...productForm, warrantyMonths: val })}
                          placeholder="Số tháng bảo hành"
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors h-[38px] ${fieldErrors.warrantyMonths ? "border-red-400 focus:ring-red-500" : "border-divider"}`}
                        />
                        {fieldErrors.warrantyMonths && <div className="text-red-500 text-xs mt-1">{fieldErrors.warrantyMonths}</div>}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-ink/80 mb-2">Ghi chú</label>
                      <input
                        type="text"
                        value={productForm.note}
                        onChange={(e) => setProductForm({ ...productForm, note: e.target.value })}
                        placeholder="Ghi chú thêm (tùy chọn)"
                        className="px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 h-[38px]"
                      />
                    </div>

                    {/* Variants */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-ink/80 required-label">Phân loại sản phẩm</label>
                        <button
                          type="button"
                          onClick={() => setProductForm({ ...productForm, variants: [...productForm.variants, { variantName: "" }] })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-divider text-brand-600 rounded-lg text-xs font-bold hover:bg-brand-50 hover:border-brand-200 transition-colors"
                        >
                          <Plus size={14} /> Thêm phân loại
                        </button>
                      </div>
                      <div className="space-y-2 bg-canvas p-4 rounded-xl border border-divider/50">
                        {productForm.variants.length > 0 && (
                          <div className="hidden md:flex gap-2 items-center px-1 mb-1">
                            <div className="flex-1 text-xs font-semibold text-muted uppercase tracking-wider">Tên phân loại (vd: Đen, 256GB, ...)</div>
                            <div className="w-[34px]"></div>
                          </div>
                        )}
                        {fieldErrors.variants && <div className="text-red-500 text-sm mb-2">{fieldErrors.variants}</div>}
                        {productForm.variants.map((variant, index) => (
                          <div key={index} className="flex flex-col gap-1 mb-2">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={variant.variantName}
                                  onChange={(e) => {
                                    const next = [...productForm.variants];
                                    next[index] = { ...variant, variantName: e.target.value };
                                    setProductForm({ ...productForm, variants: next });
                                  }}
                                  placeholder="Nhập phân loại"
                                  className={`w-full min-w-0 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 h-[38px] ${fieldErrors[`variant_${index}_name`] ? "border-red-400 focus:ring-red-500" : "border-divider"}`}
                                />
                                {fieldErrors[`variant_${index}_name`] && <div className="text-red-500 text-[10px] mt-1">{fieldErrors[`variant_${index}_name`]}</div>}
                              </div>
                              <button
                                type="button"
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 shrink-0 mt-0.5"
                                onClick={() => setProductForm({ ...productForm, variants: productForm.variants.filter((_, i) => i !== index) })}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-divider">
                      <button
                        onClick={() => void submitProduct()}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 disabled:bg-disabled disabled:cursor-not-allowed transition-all shadow-md shadow-brand-500/20"
                      >
                        <Save size={16} /> {productForm.id ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
                      </button>
                      <button
                        onClick={() => { setProductForm(emptyProduct); setHasSubmittedProduct(false); setError(null); }}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-100/40 text-ink/80 rounded-lg font-bold text-sm hover:bg-brand-100 transition-all"
                      >
                        <RefreshCw size={16} /> Làm mới
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search Filters */}
                <div className="bg-white rounded-xl border border-divider overflow-hidden shadow-soft-sm">
                  <div className="px-6 py-4 bg-canvas border-b border-divider">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-ink/80 mb-2">Tên sản phẩm</label>
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) => setKeyword(e.target.value)}
                          placeholder="Tìm kiếm theo tên sản phẩm..."
                          className="px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-ink/80 mb-2">Danh mục</label>
                        <select
                          value={filterCategoryId}
                          onChange={(e) => setFilterCategoryId(Number(e.target.value))}
                          className="px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                        >
                          <option value={0}>Tất cả danh mục</option>
                          {categoryOptions.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={() => { if (productPage === 0) void loadProducts(); else setProductPage(0); }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20"
                      >
                        <Search size={16} /> Tìm kiếm
                      </button>
                      <button
                        onClick={() => { setKeyword(""); setFilterCategoryId(0); if (productPage === 0) void loadProducts(true); else setProductPage(0); }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-100/40 text-ink/80 rounded-lg font-bold text-sm hover:bg-brand-100 transition-all"
                      >
                        <RefreshCw size={16} /> Làm mới
                      </button>
                    </div>
                  </div>

                  {/* Product Table */}
                  <DataState loading={productLoading}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-canvas border-b border-divider">
                          <tr>
                            <th className="px-6 py-3 text-left font-bold text-ink/80 uppercase tracking-wider">Sản phẩm</th>
                            <th className="px-6 py-3 text-left font-bold text-ink/80 uppercase tracking-wider">Danh mục</th>
                            <th className="px-6 py-3 text-left font-bold text-ink/80 uppercase tracking-wider">Phân loại</th>
                            <th className="px-6 py-3 text-center font-bold text-ink/80 uppercase tracking-wider">Bảo hành</th>
                            <th className="px-6 py-3 text-center font-bold text-ink/80 uppercase tracking-wider">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-divider">
                          {products.map((product) => (
                            <tr key={product.id} className="hover:bg-canvas transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-ink">{product.name}</div>
                                {product.note && <div className="text-xs text-muted italic">{product.note}</div>}
                              </td>
                              <td className="px-6 py-4 text-muted">{product.categoryName}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {product.variants.map((v) => (
                                    <span key={v.variantName} className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs border border-brand-100">
                                      {v.variantName}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">{product.warrantyMonths} tháng</td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button onClick={() => editProduct(product)} className="p-1.5 bg-brand-50 text-brand-600 rounded hover:bg-brand-100 transition-colors">✏️</button>
                                  <button onClick={() => void removeProduct(product.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </DataState>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-divider flex justify-center gap-4 bg-canvas/60 items-center">
                    <button
                      onClick={() => setProductPage(Math.max(0, productPage - 1))}
                      disabled={productPage <= 0}
                      className="px-4 py-2 border border-divider text-ink/80 rounded-lg text-sm font-medium hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Trước
                    </button>
                    <span className="text-sm">
                      Trang <strong>{productPage + 1}</strong> / <strong>{Math.max(productTotalPages, 1)}</strong>
                    </span>
                    <button
                      onClick={() => setProductPage(productPage + 1)}
                      disabled={productPage + 1 >= productTotalPages}
                      className="px-4 py-2 border border-divider text-ink/80 rounded-lg text-sm font-medium hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Sau →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Category Form */}
                <div className="bg-white rounded-lg shadow-soft-md p-6 mb-6">
                  <div className="mb-6 pb-4 border-b border-divider">
                    <h2 className="text-xl font-semibold text-ink">
                      {categoryForm.id ? "Cập nhật danh mục" : "Thêm danh mục mới"}
                    </h2>
                    <p className="text-muted text-sm mt-1">Quản lý nhóm sản phẩm</p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-ink/80 mb-2 required-label">Tên danh mục</label>
                        <input
                          type="text"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          placeholder="Nhập tên danh mục..."
                          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 h-[38px] ${fieldErrors.name ? "border-red-400 focus:ring-red-500" : "border-divider"}`}
                        />
                        {fieldErrors.name && <div className="text-red-500 text-xs mt-1">{fieldErrors.name}</div>}
                      </div>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-ink/80 mb-2">Mô tả</label>
                        <input
                          type="text"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          placeholder="Mô tả ngắn gọn"
                          className="px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 h-[38px]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-divider">
                      <button
                        onClick={() => void submitCategory()}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 disabled:bg-disabled disabled:cursor-not-allowed transition-all shadow-md shadow-brand-500/20"
                      >
                        <Save size={16} /> {categoryForm.id ? "Cập nhật danh mục" : "Thêm danh mục"}
                      </button>
                      <button
                        onClick={() => { setCategoryForm(emptyCategory); setHasSubmittedCategory(false); setError(null); }}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-100/40 text-ink/80 rounded-lg font-bold text-sm hover:bg-brand-100 transition-all"
                      >
                        <RefreshCw size={16} /> Làm mới
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Table */}
                <DataState loading={categoryLoading}>
                <div className="bg-white rounded-xl border border-divider overflow-hidden shadow-soft-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead className="bg-canvas border-b border-divider">
                        <tr>
                          <th className="px-6 py-3 text-left font-bold text-ink/80 uppercase tracking-wider">Tên danh mục</th>
                          <th className="px-6 py-3 text-left font-bold text-ink/80 uppercase tracking-wider">Mô tả</th>
                          <th className="px-6 py-3 text-center font-bold text-ink/80 uppercase tracking-wider">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {categories.map((cat) => (
                          <tr key={cat.id} className="hover:bg-canvas transition-colors">
                            <td className="px-6 py-4 font-bold text-ink">{cat.name}</td>
                            <td className="px-6 py-4 text-muted">{cat.description || "-"}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => editCategory(cat)} className="p-1.5 bg-brand-50 text-brand-600 rounded hover:bg-brand-100 transition-colors">✏️</button>
                                <button onClick={() => void removeCategory(cat.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-divider flex justify-center gap-4 bg-canvas/60">
                    <button
                      onClick={() => setCategoryPage(Math.max(0, categoryPage - 1))}
                      disabled={categoryPage <= 0}
                      className="px-4 py-2 border border-divider text-ink/80 rounded-lg text-sm font-medium hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Trước
                    </button>
                    <span className="text-sm self-center">
                      Trang {categoryPage + 1} / {Math.max(categoryTotalPages, 1)}
                    </span>
                    <button
                      onClick={() => setCategoryPage(categoryPage + 1)}
                      disabled={categoryPage + 1 >= categoryTotalPages}
                      className="px-4 py-2 border border-divider text-ink/80 rounded-lg text-sm font-medium hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Sau →
                    </button>
                  </div>
                </div>
                </DataState>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
