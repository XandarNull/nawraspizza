The migration adding `vapid_public_key` and `source_origin` columns to `push_subscriptions` was created in the previous turn but never approved/run, so the production database is still missing those columns — hence Vercel's error.

## Fix

Re-issue the pending migration so you can approve and run it:

1. Add `vapid_public_key text` and `source_origin text` columns to `push_subscriptions` (idempotent with `IF NOT EXISTS`).
2. Keep existing RLS/grants untouched.

Once you approve and it runs, redeploy on Vercel (or just retry) and the "column does not exist" error will go away.

No code changes needed — the app code already expects these columns.