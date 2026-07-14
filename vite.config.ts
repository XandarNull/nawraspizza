// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Deploy target for Nitro. Vercel sets VERCEL=1 automatically in its build env,
// so this pins the Vercel preset there while leaving Lovable builds untouched
// (Lovable forces the Cloudflare preset regardless of this override).
const nitroPreset = process.env.NITRO_PRESET || (process.env.VERCEL ? "vercel" : undefined);

const nitroOptions = nitroPreset ? { preset: nitroPreset } : true;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: nitroOptions,
});
