CREATE TABLE public.restaurant_settings (
  id int PRIMARY KEY DEFAULT 1,
  is_open boolean NOT NULL DEFAULT true,
  unavailable_pizzas text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.restaurant_settings TO anon, authenticated;
GRANT ALL ON public.restaurant_settings TO service_role;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read restaurant settings" ON public.restaurant_settings FOR SELECT USING (true);
INSERT INTO public.restaurant_settings (id, is_open, unavailable_pizzas) VALUES (1, true, '{}') ON CONFLICT (id) DO NOTHING;