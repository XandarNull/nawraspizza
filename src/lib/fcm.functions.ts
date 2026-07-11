import { createServerFn } from "@tanstack/react-start";
import { useSession, getCookie } from "@tanstack/react-start/server";

const SESSION_NAME = "nawras_dash";
const SESSION_MAX_AGE = 60 * 60 * 24 * 90;

type DashSession = { authed?: boolean };

function sessionConfig() {
  return {
    password: process.env.SESSION_SECRET!,
    name: SESSION_NAME,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  };
}

async function requireDashAuth() {
  const raw = getCookie(SESSION_NAME);
  if (!raw) throw new Error("Unauthorized");
  const session = await useSession<DashSession>(sessionConfig());
  if (!session.data.authed) throw new Error("Unauthorized");
}


export const sendBroadcastNotification = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; body: string }) => {
    const title = String(data?.title ?? "").trim().slice(0, 120);
    const body = String(data?.body ?? "").trim().slice(0, 500);
    if (!title || !body) throw new Error("العنوان والمحتوى مطلوبان");
    return { title, body };
  })
  .handler(async ({ data }) => {
    await requireDashAuth();
    const { sendFcmMessage } = await import("./fcm.server");
    const id = await sendFcmMessage({
      notification: { title: data.title, body: data.body },
      android: {
        notification: { channelId: "nawras_fcm_channel", sound: "default" },
      },
      topic: "all_users",
    });
    return { ok: true as const, id };
  });

export const sendOrderUpdateNotification = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; title: string; body: string }) => {
    const orderId = String(data?.orderId ?? "").trim();
    const title = String(data?.title ?? "").trim().slice(0, 120);
    const body = String(data?.body ?? "").trim().slice(0, 500);
    if (!orderId) throw new Error("Missing orderId");
    if (!title || !body) throw new Error("العنوان والمحتوى مطلوبان");
    return { orderId, title, body };
  })
  .handler(async ({ data }) => {
    await requireDashAuth();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("fcm_token, tracking_token")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = order as { fcm_token: string | null; tracking_token: string } | null;
    if (!row?.fcm_token) throw new Error("لا يوجد رمز إشعار محفوظ لهذا الطلب");
    const { sendFcmMessage } = await import("./fcm.server");
    const id = await sendFcmMessage({
      notification: { title: data.title, body: data.body },
      data: row.tracking_token ? { tracking_token: row.tracking_token } : {},
      android: {
        notification: { channelId: "nawras_fcm_channel", sound: "default" },
      },
      token: row.fcm_token,
    });
    return { ok: true as const, id };
  });

export const listActiveOrdersForNotify = createServerFn({ method: "GET" }).handler(async () => {
  await requireDashAuth();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, customer_name, status, created_at, fcm_token")
    .not("status", "in", "(done,cancelled)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Array<{
    id: string;
    customer_name: string;
    status: string;
    created_at: string;
    fcm_token: string | null;
  }>;
});
