import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DataState } from "../components/DataState";
import { Pagination } from "../components/Pagination";
import { catalogService } from "../services/catalogService";
import type { Product, ProductCategory } from "../types/models";
import type { CategoryForm, ProductForm } from "../types/forms";
import { firstError, minNumber, required } from "../utils/validation";

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
  const [productPage, setProductPage] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(0);
  const [categoryTotalPages, setCategoryTotalPages] = useState(0);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [productResult, categoryResult, categoryOptions] = await Promise.all([
        catalogService.products({ page: productPage, size: 20, name: keyword }),
        catalogService.categories({ page: categoryPage, size: 20, keyword }),
        catalogService.categories({ page: 0, size: 500 }),
      ]);
      setProducts(productResult.items);
      setProductTotalPages(productResult.totalPages);
      setCategories(categoryOptions.items);
      setCategoryTotalPages(categoryResult.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [productPage, categoryPage]);

  function validateProduct() {
    return firstError([
      required(productForm.name, "Tên sản phẩm là bắt buộc"),
      minNumber(productForm.categoryId, 1, "Danh mục là bắt buộc"),
      minNumber(productForm.warrantyMonths, 1, "Số tháng bảo hành phải lớn hơn 0"),
      productForm.variants.length > 0 && productForm.variants.some((item) => item.variantName.trim())
        ? { valid: true }
        : { valid: false, message: "Phải có ít nhất 1 phân loại" },
    ]);
  }

  async function submitProduct() {
    const validation = validateProduct();
    if (validation) return setError(validation);
    setLoading(true);
    setError(null);
    try {
      if (productForm.id) await catalogService.updateProduct(productForm);
      else await catalogService.createProduct(productForm);
      setProductForm(emptyProduct);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitCategory() {
    const validation = firstError([required(categoryForm.name, "Tên danh mục là bắt buộc")]);
    if (validation) return setError(validation);
    setLoading(true);
    setError(null);
    try {
      if (categoryForm.id) await catalogService.updateCategory(categoryForm);
      else await catalogService.createCategory(categoryForm);
      setCategoryForm(emptyCategory);
      await load();
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeCategory(id: number) {
    if (!window.confirm("Xóa danh mục này?")) return;
    try {
      await catalogService.deleteCategory(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Sản phẩm</h1>
          <p>Danh mục, sản phẩm và phân loại sản phẩm.</p>
        </div>
        <div className="toolbar">
          <label className="field">
            <span>Tìm kiếm</span>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} />
          </label>
          <button className="secondary" onClick={() => void load()}>Tìm</button>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "PRODUCT" ? "active" : ""} onClick={() => setTab("PRODUCT")}>Sản phẩm</button>
        <button className={tab === "CATEGORY" ? "active" : ""} onClick={() => setTab("CATEGORY")}>Danh mục</button>
      </div>

      <DataState loading={loading} error={error} empty={false}>
        {tab === "PRODUCT" ? (
          <div className="grid two">
            <section className="form-panel">
              <h2>{productForm.id ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}</h2>
              <div className="form-grid">
                <label className="field"><span>Tên</span><input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
                <label className="field"><span>Danh mục</span><select value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: Number(event.target.value) })}><option value={0}>Chọn danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className="field"><span>Bảo hành</span><input type="number" min={1} value={productForm.warrantyMonths} onChange={(event) => setProductForm({ ...productForm, warrantyMonths: Number(event.target.value) })} /></label>
                <label className="field full"><span>Ghi chú</span><textarea value={productForm.note} onChange={(event) => setProductForm({ ...productForm, note: event.target.value })} /></label>
              </div>
              <div className="inline-list">
                <strong>Phân loại</strong>
                {productForm.variants.map((variant, index) => (
                  <div className="inline-row" key={index}>
                    <input value={variant.variantName} onChange={(event) => {
                      const next = [...productForm.variants];
                      next[index] = { ...variant, variantName: event.target.value };
                      setProductForm({ ...productForm, variants: next });
                    }} />
                    <button className="ghost" onClick={() => setProductForm({ ...productForm, variants: productForm.variants.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
                  </div>
                ))}
                <button className="secondary" onClick={() => setProductForm({ ...productForm, variants: [...productForm.variants, { variantName: "" }] })}><Plus size={16} /> Thêm phân loại</button>
              </div>
              <div className="toolbar">
                <button className="primary" onClick={() => void submitProduct()}><Save size={16} /> Lưu</button>
                <button className="ghost" onClick={() => setProductForm(emptyProduct)}>Làm mới</button>
              </div>
            </section>

            <section className="section">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Tên</th><th>Danh mục</th><th>Phân loại</th><th></th></tr></thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.id}</td>
                        <td>{product.name}</td>
                        <td>{product.categoryName}</td>
                        <td>{product.variants.map((variant) => variant.variantName).join(", ")}</td>
                        <td><div className="row-actions"><button className="secondary" onClick={() => editProduct(product)}>Sửa</button><button className="danger" onClick={() => void removeProduct(product.id)}>Xóa</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={productPage} totalPages={productTotalPages} onChange={setProductPage} />
            </section>
          </div>
        ) : (
          <div className="grid two">
            <section className="form-panel">
              <h2>{categoryForm.id ? "Cập nhật danh mục" : "Tạo danh mục"}</h2>
              <div className="form-grid">
                <label className="field"><span>Tên</span><input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
                <label className="field full"><span>Mô tả</span><textarea value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></label>
              </div>
              <div className="toolbar">
                <button className="primary" onClick={() => void submitCategory()}><Save size={16} /> Lưu</button>
                <button className="ghost" onClick={() => setCategoryForm(emptyCategory)}>Làm mới</button>
              </div>
            </section>
            <section className="section">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Tên</th><th>Mô tả</th><th></th></tr></thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}><td>{category.id}</td><td>{category.name}</td><td>{category.description}</td><td><div className="row-actions"><button className="secondary" onClick={() => editCategory(category)}>Sửa</button><button className="danger" onClick={() => void removeCategory(category.id)}>Xóa</button></div></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={categoryPage} totalPages={categoryTotalPages} onChange={setCategoryPage} />
            </section>
          </div>
        )}
      </DataState>
    </>
  );
}
