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

function providerDto(row: any) {
  const shippers = [...(row.shippers ?? row.shipping_provider_shippers ?? [])]
    .sort((a: any, b: any) => Number(a.id) - Number(b.id));
  return {
    id: row.id,
    providerName: row.provider_name,
    shippers: shippers.map((shipper: any) => ({
      id: shipper.id,
      shipperName: shipper.shipper_name,
      shipperPhone: shipper.shipper_phone,
    })),
  };
}

async function loadProvider(id: number) {
  return await maybeOne<any>(
    db
      .from("shipping_providers")
      .select("*, shippers:shipping_provider_shippers(*)")
      .eq("id", id)
      .single(),
  );
}

async function duplicateProviderName(name: string, excludeId?: number) {
  let query = db.from("shipping_providers").select("id,provider_name");
  if (excludeId) query = query.neq("id", excludeId);
  const rows = await unwrap<any[]>(query);
  return rows.some((row) => equalsIgnoreCase(row.provider_name, name));
}

function validShippers(body: any) {
  if (!Array.isArray(body?.shippers) || body.shippers.length === 0) {
    badRequest("Danh sách shipper là bắt buộc");
  }
  const shippers = body.shippers
    .map((shipper: any) => ({
      shipper_name: trimOrNull(shipper?.shipperName),
      shipper_phone: trimOrNull(shipper?.shipperPhone),
    }))
    .filter((shipper: any) => shipper.shipper_name && shipper.shipper_phone);
  if (shippers.length === 0) {
    badRequest("Phải có ít nhất 1 shipper hợp lệ");
  }
  return shippers;
}

function validateProviderBody(body: any) {
  if (!body) badRequest("Thiếu dữ liệu request");
  if (isBlank(body.providerName)) {
    badRequest("Tên đơn vị giao hàng là bắt buộc");
  }
  return {
    providerName: String(body.providerName).trim(),
    shippers: validShippers(body),
  };
}

export async function listShippingProviders(query: URLSearchParams) {
  const page = pageParam(query);
  const size = sizeParam(query);
  const keyword = trimOrNull(query.get("keyword"));
  const rows = await unwrap<any[]>(
    db
      .from("shipping_providers")
      .select("*, shippers:shipping_provider_shippers(*)")
      .order("id", { ascending: false }),
  );
  const filtered = rows.filter((row) => {
    if (!keyword) return true;
    return (
      includesIgnoreCase(row.provider_name, keyword) ||
      (row.shippers ?? []).some((shipper: any) =>
        includesIgnoreCase(shipper.shipper_name, keyword) ||
        includesIgnoreCase(shipper.shipper_phone, keyword)
      )
    );
  });
  const from = page * size;
  return paged(
    filtered.slice(from, from + size).map(providerDto),
    page,
    size,
    filtered.length,
  );
}

export async function getShippingProvider(id: number) {
  const row = await loadProvider(id);
  if (!row) notFound("Không tìm thấy đơn vị giao hàng");
  return providerDto(row);
}

export async function createShippingProvider(body: any) {
  const { providerName, shippers } = validateProviderBody(body);
  if (await duplicateProviderName(providerName)) {
    badRequest("Tên đơn vị giao hàng đã tồn tại");
  }
  const provider = await unwrap<any>(
    db
      .from("shipping_providers")
      .insert({ provider_name: providerName })
      .select("*")
      .single(),
  );
  await unwrap(
    db.from("shipping_provider_shippers").insert(
      shippers.map((shipper: any) => ({
        provider_id: provider.id,
        ...shipper,
      })),
    ),
  );
  return providerDto((await loadProvider(provider.id))!);
}

export async function updateShippingProvider(id: number, body: any) {
  const existing = await loadProvider(id);
  if (!existing) notFound("Không tìm thấy đơn vị giao hàng");
  const { providerName, shippers } = validateProviderBody(body);
  if (await duplicateProviderName(providerName, id)) {
    badRequest("Tên đơn vị giao hàng đã tồn tại");
  }
  await unwrap(
    db
      .from("shipping_providers")
      .update({ provider_name: providerName })
      .eq("id", id),
  );
  await unwrap(
    db.from("shipping_provider_shippers").delete().eq("provider_id", id),
  );
  await unwrap(
    db.from("shipping_provider_shippers").insert(
      shippers.map((shipper: any) => ({
        provider_id: id,
        ...shipper,
      })),
    ),
  );
  return providerDto((await loadProvider(id))!);
}

export async function deleteShippingProvider(id: number) {
  const existing = await loadProvider(id);
  if (!existing) notFound("Không tìm thấy đơn vị giao hàng");
  const orders = await unwrap<any[]>(
    db.from("sales_orders").select("id").eq("shipping_provider_id", id).limit(1),
  );
  if (orders.length > 0) {
    badRequest("Đơn vị giao hàng đang được sử dụng, không thể xóa");
  }
  await unwrap(db.from("shipping_providers").delete().eq("id", id));
  return emptyOk();
}

export async function findShipperName(
  providerId: number,
  shipperPhone: string,
) {
  const rows = await unwrap<any[]>(
    db
      .from("shipping_provider_shippers")
      .select("shipper_name")
      .eq("provider_id", providerId)
      .eq("shipper_phone", shipperPhone)
      .limit(1),
  );
  return rows[0]?.shipper_name ?? null;
}
