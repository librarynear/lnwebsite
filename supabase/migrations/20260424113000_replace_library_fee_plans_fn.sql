CREATE OR REPLACE FUNCTION public.replace_library_fee_plans(
  p_library_branch_id UUID,
  p_plans JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.library_fee_plans
  WHERE library_branch_id = p_library_branch_id;

  IF p_plans IS NULL OR jsonb_typeof(p_plans) <> 'array' OR jsonb_array_length(p_plans) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.library_fee_plans (
    library_branch_id,
    plan_name,
    plan_type,
    plan_category,
    duration_key,
    duration_label,
    price,
    base_price,
    discount_percentage,
    discounted_price,
    currency,
    seat_type,
    hours_per_day,
    description,
    offer_name,
    sort_order,
    is_active
  )
  SELECT
    p_library_branch_id,
    plan.plan_name,
    plan.plan_type,
    plan.plan_category,
    plan.duration_key,
    plan.duration_label,
    plan.price,
    plan.base_price,
    plan.discount_percentage,
    plan.discounted_price,
    COALESCE(plan.currency, 'INR'),
    plan.seat_type,
    plan.hours_per_day,
    plan.description,
    plan.offer_name,
    COALESCE(plan.sort_order, 0),
    COALESCE(plan.is_active, true)
  FROM jsonb_to_recordset(p_plans) AS plan(
    plan_name TEXT,
    plan_type TEXT,
    plan_category TEXT,
    duration_key TEXT,
    duration_label TEXT,
    price INTEGER,
    base_price INTEGER,
    discount_percentage INTEGER,
    discounted_price INTEGER,
    currency TEXT,
    seat_type TEXT,
    hours_per_day INTEGER,
    description TEXT,
    offer_name TEXT,
    sort_order INTEGER,
    is_active BOOLEAN
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_library_fee_plans(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_library_fee_plans(UUID, JSONB) TO service_role;
