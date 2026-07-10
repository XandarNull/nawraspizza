import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/push-vapid-key")({
  server: {
    handlers: {
      GET: async () => {
        const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || "";
        return new Response(JSON.stringify({ publicKey }), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
