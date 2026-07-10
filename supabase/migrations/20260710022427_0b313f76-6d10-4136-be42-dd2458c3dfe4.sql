ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS vapid_public_key text,
  ADD COLUMN IF NOT EXISTS source_origin text;

UPDATE public.push_subscriptions
SET vapid_public_key = COALESCE(vapid_public_key, current_setting('app.missing_vapid_public_key', true))
WHERE vapid_public_key IS NULL;

CREATE INDEX IF NOT EXISTS push_subscriptions_vapid_public_key_idx
ON public.push_subscriptions (vapid_public_key);