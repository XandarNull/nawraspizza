DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'No direct public access to orders'
  ) THEN
    CREATE POLICY "No direct public access to orders"
    ON public.orders
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_subscriptions' AND policyname = 'No direct public access to push subscriptions'
  ) THEN
    CREATE POLICY "No direct public access to push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;