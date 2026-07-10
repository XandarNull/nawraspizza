import { createFileRoute } from "@tanstack/react-router";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...jsonHeaders, ...(init?.headers ?? {}) },
  });
}

function validatePayload(input: unknown) {
  const data = input as {
    endpoint?: unknown;
    p256dh?: unknown;
    auth?: unknown;
    vapid_public_key?: unknown;
    source_origin?: unknown;
    user_agent?: unknown;
  };

  if (!data || typeof data !== "object") throw new Error("bad-payload");
  if (typeof data.endpoint !== "string" || !data.endpoint.startsWith("https://")) {
    throw new Error("bad-endpoint");
  }
  if (typeof data.p256dh !== "string" || data.p256dh.length < 20) throw new Error("bad-p256dh");
  if (typeof data.auth !== "string" || data.auth.length < 10) throw new Error("bad-auth");
  if (typeof data.vapid_public_key !== "string" || data.vapid_public_key.length < 80) {
    throw new Error("bad-vapid-key");
  }

  return {
    endpoint: data.endpoint.slice(0, 1000),
    p256dh: data.p256dh.slice(0, 200),
    auth: data.auth.slice(0, 200),
    vapid_public_key: data.vapid_public_key.slice(0, 200),
    source_origin: typeof data.source_origin === "string" ? data.source_origin.slice(0, 300) : null,
    user_agent: typeof data.user_agent === "string" ? data.user_agent.slice(0, 300) : null,
  };
}

export const Route = createFileRoute("/api/public/push-subscription")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = validatePayload(await request.json());
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
            {
              ...payload,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "endpoint" },
          );

          if (error) {
            console.error("[push-subscription] save failed", error.message);
            return json({ ok: false, error: "save-failed" }, { status: 500 });
          }

          return json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "bad-request";
          console.error("[push-subscription] request failed", message);
          return json({ ok: false, error: message }, { status: message.startsWith("bad-") ? 400 : 500 });
        }
      },
    },
  },
});
