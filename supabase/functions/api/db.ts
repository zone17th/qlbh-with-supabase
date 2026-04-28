import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./http.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Edge Function",
  );
}

export const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function unwrap<T>(
  promise: PromiseLike<{ data: T; error: { message: string; code?: string } | null }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    throw new HttpError(500, `Unexpected error: ${error.message}`);
  }
  return data;
}

export async function maybeOne<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>,
): Promise<T | null> {
  const { data, error } = await promise;
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new HttpError(500, `Unexpected error: ${error.message}`);
  }
  return data;
}

export async function countRows(table: string, column: string, value: unknown) {
  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw new HttpError(500, `Unexpected error: ${error.message}`);
  return count ?? 0;
}
