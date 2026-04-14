ALTER TABLE public.library_fee_plans
  ADD COLUMN IF NOT EXISTS plan_category TEXT NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS duration_key TEXT,
  ADD COLUMN IF NOT EXISTS hours_per_day INTEGER,
  ADD COLUMN IF NOT EXISTS base_price INTEGER,
  ADD COLUMN IF NOT EXISTS discount_percentage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discounted_price INTEGER,
  ADD COLUMN IF NOT EXISTS offer_name TEXT;

UPDATE public.library_fee_plans
SET
  base_price = COALESCE(base_price, price),
  discounted_price = COALESCE(discounted_price, price),
  discount_percentage = COALESCE(discount_percentage, 0),
  plan_category = COALESCE(NULLIF(plan_category, ''), 'regular')
WHERE
  base_price IS NULL
  OR discounted_price IS NULL
  OR plan_category IS NULL;

ALTER TABLE public.library_fee_plans
  ADD CONSTRAINT library_fee_plans_discount_percentage_check
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

ALTER TABLE public.library_fee_plans
  ADD CONSTRAINT library_fee_plans_hours_per_day_check
    CHECK (hours_per_day IS NULL OR (hours_per_day >= 1 AND hours_per_day <= 24));
