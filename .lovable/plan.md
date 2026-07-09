## Fix Vercel `vercel.json` header pattern

Vercel's `headers[].source` uses path-to-regexp, which does not support regex non-capturing groups like `(?:...)`. That's why the deploy rejects the second header entry.

### Change
In `vercel.json`, replace the single regex source with a glob using an extension list:

```json
{
  "source": "/:path*.(js|css|woff2|woff|ttf|otf|eot|ico|png|jpg|jpeg|webp|avif|svg|gif)",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
  ]
}
```

This matches any hashed static asset at any depth (e.g. `/assets/foo.abc123.js`, `/icons/logo.png`) and applies the same immutable long-cache header, without using unsupported regex syntax.

No other entries need to change — the existing `/assets/(.*)`, `/sw.js`, `/manifest.webmanifest`, and catch-all `/(.*)` sources are all valid path-to-regexp patterns.

### Why
Vercel validates every `source` at deploy time. `(?:...)` is a regex-only construct; path-to-regexp expects `(a|b|c)` inside a named param segment. Swapping to `:path*.(ext1|ext2|...)` keeps the intent (long-cache any static asset by extension) while passing validation.
