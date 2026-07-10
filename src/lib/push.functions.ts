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

// --- Public: save a push subscription ---
export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { endpoint: string; p256dh: string; auth: string; user_agent?: string }) => {
      if (!data?.endpoint || typeof data.endpoint !== "string") throw new Error("endpoint");
      if (!data?.p256dh || typeof data.p256dh !== "string") throw new Error("p256dh");
      if (!data?.auth || typeof data.auth !== "string") throw new Error("auth");
      return {
        endpoint: data.endpoint.slice(0, 1000),
        p256dh: data.p256dh.slice(0, 200),
        auth: data.auth.slice(0, 200),
        user_agent: (data.user_agent || "").slice(0, 300) || null,
      };
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (t: string) => {
        upsert: (v: unknown, o?: unknown) => Promise<{ error: { message: string } | null }>;
      };
    };
    const { error } = await client.from("push_subscriptions").upsert(
      {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.user_agent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// --- Admin: count of active subscribers ---
export const countPushSubscribers = createServerFn({ method: "GET" }).handler(async () => {
  await requireDashAuth();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true });
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
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");
    if (error) throw new Error(error.message);

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url,
      tag: "nawras-broadcast",
    });

    let sent = 0;
    let removed = 0;
    const staleIds: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint as string,
              keys: { p256dh: s.p256dh as string, auth: s.auth as string },
            },
            payload,
          );
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            staleIds.push(s.id as string);
            removed++;
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", staleIds);
    }

    return { sent, removed, total: (subs ?? []).length };
  });
