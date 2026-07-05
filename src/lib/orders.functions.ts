import { createServerFn } from "@tanstack/react-start";
import { useSession, getCookie } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

const SESSION_NAME = "nawras_dash";
const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

type DashSession = { authed?: boolean };

function sessionConfig() {
  return {
    password: process.env.SESSION_SECRET!,
    name: SESSION_NAME,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      secure: true,
      // 'none' so the cookie is set inside the Lovable preview iframe (cross-site context).
      // Requires secure: true (already set). Works the same on the published site.
      sameSite: "none" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireDashAuth() {
  const session = await useSession<DashSession>(sessionConfig());
  if (!session.data.authed) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ---------- Auth ----------

export const dashboardLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.DASHBOARD_PASSWORD;
    if (!expected) throw new Error("DASHBOARD_PASSWORD not configured");
    if (!passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await useSession<DashSession>(sessionConfig());
    await session.update({ authed: true });
    return { ok: true as const };
  });

export const dashboardLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<DashSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const dashboardSession = createServerFn({ method: "GET" }).handler(async () => {
  // Avoid touching useSession when no cookie exists; keeps cold-start fast
  const raw = getCookie(SESSION_NAME);
  if (!raw) return { authed: false };
  const session = await useSession<DashSession>(sessionConfig());
  return { authed: Boolean(session.data.authed) };
});

// ---------- Orders (dashboard) ----------

export type OrderItemDTO = {
  kind: "pizza" | "drink";
  qty: number;
  label: string;
  unit_price: number;
};

export type OrderDTO = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  items: OrderItemDTO[];
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  tracking_token: string;
};

export const listOrders = createServerFn({ method: "GET" }).handler(async () => {
  await requireDashAuth();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, customer_name, phone, address, latitude, longitude, items, total, status, notes, created_at, tracking_token",
    )
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OrderDTO[];
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string }) => {
    const allowed = ["new", "preparing", "out", "done", "cancelled"];
    if (!allowed.includes(data.status)) throw new Error("Invalid status");
    if (!data.id) throw new Error("Missing id");
    return data;
  })
  .handler(async ({ data }) => {
    await requireDashAuth();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Order creation (public) ----------

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as Record<string, unknown>;
    if (!d || typeof d !== "object") throw new Error("Invalid payload");
    const str = (v: unknown, max: number) =>
      typeof v === "string" ? v.trim().slice(0, max) : "";
    const customer_name = str(d.customer_name, 100);
    const phone = str(d.phone, 30);
    const address = str(d.address, 300);
    const notes = d.notes == null ? null : str(d.notes, 500) || null;
    const latitude =
      typeof d.latitude === "number" && Number.isFinite(d.latitude) ? d.latitude : null;
    const longitude =
      typeof d.longitude === "number" && Number.isFinite(d.longitude) ? d.longitude : null;
    const items = Array.isArray(d.items) ? d.items : [];
    const total = Number(d.total);
    if (!customer_name || !phone || !address) throw new Error("Missing required fields");
    if (items.length === 0) throw new Error("Cart is empty");
    if (!Number.isFinite(total) || total <= 0) throw new Error("Invalid total");
    return { customer_name, phone, address, notes, latitude, longitude, items, total };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        latitude: data.latitude,
        longitude: data.longitude,
        items: data.items as unknown as never,
        total: data.total,
        status: "new",
      })
      .select("id, tracking_token")
      .single();
    if (error) throw new Error(error.message);
    return { id: row!.id as string, tracking_token: row!.tracking_token as string };
  });

// ---------- Customer tracking (public, token-scoped) ----------

export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => {
    if (!data?.token || typeof data.token !== "string" || data.token.length < 8) {
      throw new Error("Invalid token");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, customer_name, address, items, total, status, notes, created_at, tracking_token",
      )
      .eq("tracking_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row as unknown as {
      id: string;
      customer_name: string;
      address: string;
      items: OrderItemDTO[];
      total: number;
      status: string;
      notes: string | null;
      created_at: string;
      tracking_token: string;
    };
  });
