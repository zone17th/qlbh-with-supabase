import { api, type PageParams, type PageResult } from "./api";
import type { Product, ProductCategory } from "../types/models";
import type { CategoryForm, ProductForm } from "../types/forms";

export const catalogService = {
  categories(params: PageParams = {}) {
    return api.get<PageResult<ProductCategory>>("/product-categories", params);
  },
  createCategory(form: CategoryForm) {
    return api.post<ProductCategory>("/product-categories", form);
  },
  updateCategory(form: CategoryForm) {
    return api.put<ProductCategory>(`/product-categories/${form.id}`, form);
  },
  deleteCategory(id: number) {
    return api.delete<null>(`/product-categories/${id}`);
  },
  products(params: PageParams & { name?: string; categoryId?: number } = {}) {
    return api.get<PageResult<Product>>("/products", params);
  },
  getProduct(id: number) {
    return api.get<Product>(`/products/${id}`);
  },
  createProduct(form: ProductForm) {
    return api.post<Product>("/products", form);
  },
  updateProduct(form: ProductForm) {
    return api.put<Product>(`/products/${form.id}`, form);
  },
  deleteProduct(id: number) {
    return api.delete<null>(`/products/${id}`);
  },
};
