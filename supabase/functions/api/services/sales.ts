import { db, maybeOne, unwrap } from "../db.ts";
import { emptyOk, notFound } from "../http.ts";
import { money, toNumberMoney } from "../money.ts";

function saleRecordDto(row: any) {
  const importPrice = row.import_price === null ? 0n : money(row.import_price);
  const salePrice = row.sale_price === null ? 0n : money(row.sale_price);
  const shippingFee = row.shipping_fee === null ? 0n : money(row.shipping_fee);
  return {
    id: row.id,
    productName: row.product_name,
    importDate: row.import_date,
    importPrice: row.import_price === null ? null : toNumberMoney(importPrice),
    salePrice: row.sale_price === null ? null : toNumberMoney(salePrice),
    shippingFee: row.shipping_fee === null ? null : toNumberMoney(shippingFee),
    saleDate: row.sale_date,
    note: row.note,
    estimatedRevenue: toNumberMoney(salePrice - importPrice - shippingFee),
  };
}

function toRow(body: any) {
  return {
    product_name: body?.productName ?? null,
    import_date: body?.importDate ?? null,
    import_price: body?.importPrice ?? null,
    sale_price: body?.salePrice ?? null,
    shipping_fee: body?.shippingFee ?? null,
    sale_date: body?.saleDate ?? null,
    note: body?.note ?? null,
  };
}

export async function listSaleRecords() {
  const rows = await unwrap<any[]>(
    db.from("sale_records").select("*").order("id", { ascending: false }),
  );
  return rows.map(saleRecordDto);
}

export async function createSaleRecord(body: any) {
  const row = await unwrap<any>(
    db.from("sale_records").insert(toRow(body)).select("*").single(),
  );
  return saleRecordDto(row);
}

export async function updateSaleRecord(id: number, body: any) {
  const existing = await maybeOne<any>(
    db.from("sale_records").select("*").eq("id", id).single(),
  );
  if (!existing) notFound("Không tìm thấy bản ghi bán hàng");
  const row = await unwrap<any>(
    db.from("sale_records").update(toRow(body)).eq("id", id).select("*").single(),
  );
  return saleRecordDto(row);
}

export async function deleteSaleRecord(id: number) {
  const existing = await maybeOne<any>(
    db.from("sale_records").select("id").eq("id", id).single(),
  );
  if (!existing) notFound("Không tìm thấy bản ghi bán hàng");
  await unwrap(db.from("sale_records").delete().eq("id", id));
  return emptyOk();
}
