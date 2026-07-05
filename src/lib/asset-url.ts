// Assets are served from Lovable's CDN at /__l5e/assets-v1/... which only
// resolves on Lovable-hosted domains. When the site is served elsewhere
// (e.g. Vercel), the relative path 404s. Prefix with the stable Lovable
// project origin so images load from any host.
const LOVABLE_ASSET_ORIGIN =
  "https://project--313e297d-abca-42d3-b3ab-43e5000a75bc.lovable.app";

export function assetUrl(asset: { url: string }): string {
  const u = asset.url;
  if (/^https?:\/\//i.test(u)) return u;
  return `${LOVABLE_ASSET_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}
