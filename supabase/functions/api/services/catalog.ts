import { db, maybeOne, unwrap } from "../db.ts";
import {
  badRequest,
  emptyOk,
  equalsIgnoreCase,
  includesIgnoreCase,
  isBlank,
  notFound,
  paged,
  pageParam,
  sizeParam,
  trimOrNull,
} from "../http.ts";

function categoryDto(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  };
}

function productDto(row: any) {
  const variants = [...(row.variants ?? row.product_variants ?? [])].sort(
    (a: any, b: any) => Number(a.id) - Number(b.id),
  );
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category?.name ?? row.product_categories?.name ?? null,
    warrantyMonths: row.warranty_months,
    note: row.note,
    variants: variants.map((variant: any) => ({
      id: variant.id,
      variantName: variant.variant_name,
    })),
  };
}

async function duplicateName(
  table: string,
  column: string,
  name: string,
  excludeId?: number,
) {
  let query = db.from(table).select("id," + column);
  if (excludeId) query = query.neq("id", excludeId);
  const rows = await unwrap<any[]>(query);
  return rows.some((row) => equalsIgnoreCase(row[column], name));
}

export async function listCategories(query: URLSearchParams) {
  const page = pageParam(query);
  const size = sizeParam(query);
  const keyword = trimOrNull(query.get("keyword"));
  const from = page * size;
  const to = from + size - 1;

  let request = db
    .from("product_categories")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);
  if (keyword) request = request.ilike("name", `%${keyword}%`);

  const { data, error, count } = await request;
  if (error) throw new Error(error.message);
  return paged((data ?? []).map(categoryDto), page, size, count ?? 0);
}

export async function createCategory(body: any) {
  if (!body || isBlank(body.name)) badRequest("Tên danh mục là bắt buộc");
  const name = String(body.name).trim();
  if (await duplicateName("product_categories", "name", name)) {
    badRequest("Tên danh mục đã tồn tại");
  }
  const row = await unwrap<any>(
    db
      .from("product_categories")
      .insert({ name, description: body.description ?? null })
      .select("*")
      .single(),
  );
  return categoryDto(row);
}

export async function updateCategory(id: number, body: any) {
  if (!body || isBlank(body.name)) badRequest("Tên danh mục là bắt buộc");
  const existing = await maybeOne<any>(
    db.from("product_categories").select("*").eq("id", id).single(),
  );
  if (!existing) notFound("Không tìm thấy danh mục");
  const name = String(body.name).trim();
  if (await duplicateName("product_categories", "name", name, id)) {
    badRequest("Tên danh mục đã tồn tại");
  }
  const row = await unwrap<any>(
    db
      .from("product_categories")
      .update({ name, description: body.description ?? null })
      .eq("id", id)
      .select("*")
      .single(),
  );
  return categoryDto(row);
}

export async function deleteCategory(id: number) {
  const existing = await maybeOne<any>(
    db.from("product_categories").select("id").eq("id", id).single(),
  );
  if (!existing) notFound("Không tìm thấy danh mục");

  const products = await unwrap<any[]>(
    db.from("products").select("id").eq("category_id", id).limit(1),
  );
  if (products.length > 0) {
    badRequest("Danh mục đang được sử dụng, không thể xóa");
  }

  await unwrap(db.from("product_categories").delete().eq("id", id));
  return emptyOk();
}

async function loadProduct(id: number) {
  return await maybeOne<any>(
    db
      .from("products")
      .select(
        "*, category:product_categories(*), variants:product_variants(*)",
      )
      .eq("id", id)
      .single(),
  );
}

async function loadCategory(id: number) {
  return await maybeOne<any>(
    db.from("product_categories").select("*").eq("id", id).single(),
  );
}

function validateProductRequest(body: any) {
  if (!body) badRequest("Thiếu dữ liệu request");
  if (isBlank(body.name)) badRequest("Tên sản phẩm là bắt buộc");
  if (body.categoryId === null || body.categoryId === undefined) {
    badRequest("Danh mục là bắt buộc");
  }
  if (
    body.warrantyMonths !== null && body.warrantyMonths !== undefined &&
    Number(body.warrantyMonths) <= 0
  ) {
    badRequest("Số tháng bảo hành phải lớn hơn 0");
  }
  if (!Array.isArray(body.variants) || body.variants.length === 0) {
    badRequest("Phải có ít nhất 1 phân loại");
  }
}

export async function listProducts(query: URLSearchParams) {
  const page = pageParam(query);
  const size = sizeParam(query);
  const keyword = trimOrNull(query.get("keyword"));
  const name = trimOrNull(query.get("name"));
  const categoryId = Number(query.get("categoryId") ?? "0");

  const rows = await unwrap<any[]>(
    db
      .from("products")
      .select(
        "*, category:product_categories(*), variants:product_variants(*)",
      )
      .order("id", { ascending: false }),
  );
  const filtered = rows.filter((row) => {
    if (keyword && !includesIgnoreCase(row.name, keyword)) return false;
    if (name && !includesIgnoreCase(row.name, name)) return false;
    if (Number.isFinite(categoryId) && categoryId > 0) {
      if (Number(row.category_id) !== categoryId) return false;
    }
    return true;
  });
  const from = page * size;
  return paged(
    filtered.slice(from, from + size).map(productDto),
    page,
    size,
    filtered.length,
  );
}

export async function getProduct(id: number) {
  const row = await loadProduct(id);
  if (!row) notFound("Không tìm thấy sản phẩm");
  return productDto(row);
}

export async function createProduct(body: any) {
  validateProductRequest(body);
  const categoryId = Number(body.categoryId);
  const category = await loadCategory(categoryId);
  if (!category) notFound("Không tìm thấy danh mục");

  const product = await unwrap<any>(
    db
      .from("products")
      .insert({
        name: String(body.name).trim(),
        category_id: categoryId,
        warranty_months: body.warrantyMonths ? Number(body.warrantyMonths) : 24,
        note: body.note ?? null,
      })
      .select("*")
      .single(),
  );

  const variants = body.variants
    .map((variant: any) => trimOrNull(variant?.variantName))
    .filter(Boolean)
    .map((variantName: string) => ({
      product_id: product.id,
      variant_name: variantName,
    }));

  if (variants.length > 0) {
    await unwrap(db.from("product_variants").insert(variants));
  }

  return productDto((await loadProduct(product.id))!);
}

async function variantUsed(productId: number, variantName: string) {
  const inventory = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("id")
      .eq("product_id", productId)
      .ilike("variant_name", variantName)
      .limit(1),
  );
  if (inventory.length > 0) return true;
  const items = await unwrap<any[]>(
    db
      .from("sales_order_items")
      .select("id")
      .eq("product_id", productId)
      .ilike("variant_name", variantName)
      .limit(1),
  );
  return items.length > 0;
}

async function productUsed(productId: number) {
  const inventory = await unwrap<any[]>(
    db
      .from("inventory_transactions")
      .select("id")
      .eq("product_id", productId)
      .limit(1),
  );
  if (inventory.length > 0) return true;
  const items = await unwrap<any[]>(
    db
      .from("sales_order_items")
      .select("id")
      .eq("product_id", productId)
      .limit(1),
  );
  return items.length > 0;
}

export async function updateProduct(id: number, body: any) {
  validateProductRequest(body);
  const existing = await loadProduct(id);
  if (!existing) notFound("Không tìm thấy sản phẩm");
  const categoryId = Number(body.categoryId);
  const category = await loadCategory(categoryId);
  if (!category) notFound("Không tìm thấy danh mục");

  const oldProductName = existing.name;
  const newProductName = String(body.name).trim();
  const requestVariants = body.variants as any[];
  const existingVariants = existing.variants ?? existing.product_variants ?? [];
  const requestedIds = new Set(
    requestVariants.map((v) => Number(v.id)).filter((idValue) => idValue > 0),
  );

  for (const variant of existingVariants) {
    if (!requestedIds.has(Number(variant.id))) {
      if (await variantUsed(id, variant.variant_name)) {
        badRequest("Phân loại đang được sử dụng, không thể xóa");
      }
      await unwrap(db.from("product_variants").delete().eq("id", variant.id));
    }
  }

  await unwrap(
    db
      .from("products")
      .update({
        name: newProductName,
        category_id: categoryId,
        warranty_months: body.warrantyMonths ? Number(body.warrantyMonths) : 24,
        note: body.note ?? null,
      })
      .eq("id", id),
  );

  for (const requestVariant of requestVariants) {
    const variantName = trimOrNull(requestVariant?.variantName);
    if (!variantName) continue;
    const variantId = Number(requestVariant.id ?? 0);
    const current = existingVariants.find((variant: any) =>
      Number(variant.id) === variantId
    );
    if (current) {
      const oldVariantName = current.variant_name;
      await unwrap(
        db
          .from("product_variants")
          .update({ variant_name: variantName })
          .eq("id", variantId),
      );
      if (!equalsIgnoreCase(oldVariantName, variantName)) {
        await unwrap(
          db
            .from("inventory_transactions")
            .update({ variant_name: variantName })
            .eq("product_id", id)
            .ilike("variant_name", oldVariantName),
        );
        await unwrap(
          db
            .from("sales_order_items")
            .update({ variant_name: variantName })
            .eq("product_id", id)
            .ilike("variant_name", oldVariantName),
        );
      }
    } else {
      await unwrap(
        db.from("product_variants").insert({
          product_id: id,
          variant_name: variantName,
        }),
      );
    }
  }

  if (oldProductName !== newProductName) {
    await unwrap(
      db
        .from("inventory_transactions")
        .update({ product_name: newProductName })
        .eq("product_id", id),
    );
    await unwrap(
      db
        .from("sales_order_items")
        .update({ product_name: newProductName })
        .eq("product_id", id),
    );
  }

  return productDto((await loadProduct(id))!);
}

export async function deleteProduct(id: number) {
  const existing = await loadProduct(id);
  if (!existing) notFound("Không tìm thấy sản phẩm");
  if (await productUsed(id)) {
    badRequest("Sản phẩm đang được sử dụng, không thể xóa");
  }
  await unwrap(db.from("products").delete().eq("id", id));
  return emptyOk();
}
