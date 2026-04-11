ALTER TABLE public.library_branches
ADD COLUMN IF NOT EXISTS cover_image_url text;

CREATE OR REPLACE FUNCTION public.sync_library_branch_cover_image(p_library_branch_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  next_cover_url text;
BEGIN
  SELECT li.imagekit_url
  INTO next_cover_url
  FROM public.library_images li
  WHERE li.library_branch_id = p_library_branch_id
  ORDER BY
    CASE WHEN li.is_cover THEN 0 ELSE 1 END ASC,
    li.sort_order ASC,
    li.created_at ASC
  LIMIT 1;

  UPDATE public.library_branches
  SET cover_image_url = next_cover_url
  WHERE id = p_library_branch_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_library_branch_cover_image_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_library_branch_cover_image(OLD.library_branch_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.library_branch_id IS DISTINCT FROM OLD.library_branch_id THEN
    PERFORM public.sync_library_branch_cover_image(OLD.library_branch_id);
  END IF;

  PERFORM public.sync_library_branch_cover_image(NEW.library_branch_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_library_branch_cover_image ON public.library_images;

CREATE TRIGGER trg_sync_library_branch_cover_image
AFTER INSERT OR UPDATE OR DELETE ON public.library_images
FOR EACH ROW
EXECUTE FUNCTION public.sync_library_branch_cover_image_trigger();

UPDATE public.library_branches lb
SET cover_image_url = cover_selection.imagekit_url
FROM (
  SELECT DISTINCT ON (li.library_branch_id)
    li.library_branch_id,
    li.imagekit_url
  FROM public.library_images li
  ORDER BY
    li.library_branch_id,
    CASE WHEN li.is_cover THEN 0 ELSE 1 END ASC,
    li.sort_order ASC,
    li.created_at ASC
) AS cover_selection
WHERE lb.id = cover_selection.library_branch_id;

UPDATE public.library_branches lb
SET cover_image_url = NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.library_images li
  WHERE li.library_branch_id = lb.id
);
