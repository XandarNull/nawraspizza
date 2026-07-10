import { createServerFn } from "@tanstack/react-start";
import { requireDashAuth } from "./dashboard-auth.server";

// --- Admin: count of active subscribers ---
export const countPushSubscribers = createServerFn({ method: "GET" }).handler(async () => {
  await requireDashAuth();
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return { count: 0 };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const client = supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (
        cols: string,
        opts?: { count?: "exact"; head?: boolean },
      ) => {
        eq: (col: string, val: string) => Promise<{ count: number | null; error: { message: string } | null }>;
      };
    };
  };
  const { count, error } = await client
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("vapid_public_key", publicKey);
  if (error) throw new Error(error.message);
  return { count: count ?? 0 };
});

// --- Admin: broadcast a push notification to all subscribers ---
export const sendPushNotification = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; body: string; url?: string }) => {
    const title = (data?.title || "").trim().slice(0, 120);
    const body = (data?.body || "").trim().slice(0, 400);
    const url = (data?.url || "/").trim().slice(0, 300) || "/";
    if (!title) throw new Error("Missing title");
    if (!body) throw new Error("Missing body");
    return { title, body, url };
  })
  .handler(async ({ data }) => {
    await requireDashAuth();
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:owner@nawraspizza.app";
    if (!publicKey || !privateKey) {
      throw new Error(
        "VAPID keys are not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT on the server.",
      );
    }

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    type SubRow = {
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
      vapid_public_key: string | null;
    };
    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (cols: string) => Promise<{ data: SubRow[] | null; error: { message: string } | null }>;
        delete: () => { in: (col: string, ids: string[]) => Promise<{ error: unknown }> };
      };
    };
    const { data: subs, error } = await client
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, vapid_public_key");
    if (error) throw new Error(error.message);

    const staleIds = (subs ?? [])
      .filter((s) => s.vapid_public_key !== publicKey)
      .map((s) => s.id);
    const deliverableSubs = (subs ?? []).filter((s) => s.vapid_public_key === publicKey);

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url,
      tag: "nawras-broadcast",
      requireInteraction: false,
    });

    let sent = 0;
    let failed = 0;
    let removed = staleIds.length;
    let lastError = "";

    await Promise.all(
      deliverableSubs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload,
            {
              TTL: 60 * 60,
              urgency: "high",
              topic: "nawras-broadcast",
            },
          );
          sent++;
        } catch (e) {
          failed++;
          const status = (e as { statusCode?: number; body?: string; message?: string }).statusCode;
          lastError =
            (e as { body?: string; message?: string }).body ||
            (e as { message?: string }).message ||
            `HTTP ${status ?? "error"}`;
          if (status === 404 || status === 410) {
            staleIds.push(s.id);
            removed++;
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      await client.from("push_subscriptions").delete().in("id", staleIds);
    }

    return { sent, removed, failed, total: (subs ?? []).length, attempted: deliverableSubs.length, lastError };
  });
