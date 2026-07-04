-- Ensure tracking_token exists, is defaulted, unique, and non-null
ALTER TABLE public.orders ALTER COLUMN tracking_token SET DEFAULT gen_random_uuid()::text;
UPDATE public.orders SET tracking_token = gen_random_uuid()::text WHERE tracking_token IS NULL;
ALTER TABLE public.orders ALTER COLUMN tracking_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_key ON public.orders(tracking_token);

-- Lock down direct API access; all reads/writes go through server functions
DROP POLICY IF EXISTS "Anyone can place orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update order status" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;

REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.orders FROM authenticated;
GRANT ALL ON public.orders TO service_role;