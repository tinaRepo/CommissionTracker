-- Require AAL2 for every RLS policy that relies on public.is_admin().
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'aal') = 'aal2', false)
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    );
$$;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_data_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR (NEW.last_data_updated_at IS DISTINCT FROM OLD.last_data_updated_at AND pg_trigger_depth() <= 1)
  THEN
    RAISE EXCEPTION 'permission denied: privileged columns are read-only'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_user_data_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'tasks' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'tags' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'public_share_pages' OR TG_TABLE_NAME = 'user_settings' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'task_images' OR TG_TABLE_NAME = 'task_tags' THEN
    SELECT user_id INTO v_user_id
    FROM public.tasks
    WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  ELSIF TG_TABLE_NAME = 'user_profiles' THEN
    IF TG_OP = 'UPDATE' AND NEW.display_name IS NOT DISTINCT FROM OLD.display_name THEN
      RETURN NEW;
    END IF;
    v_user_id := COALESCE(NEW.id, OLD.id);
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET last_data_updated_at = clock_timestamp()
    WHERE id = v_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_user_data_activity ON public.tasks;
CREATE TRIGGER track_user_data_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.mark_user_data_updated();

DROP TRIGGER IF EXISTS track_user_data_activity ON public.task_images;
CREATE TRIGGER track_user_data_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.task_images
  FOR EACH ROW EXECUTE FUNCTION public.mark_user_data_updated();

DROP TRIGGER IF EXISTS track_user_data_activity ON public.tags;
CREATE TRIGGER track_user_data_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.mark_user_data_updated();

DROP TRIGGER IF EXISTS track_user_data_activity ON public.task_tags;
CREATE TRIGGER track_user_data_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.task_tags
  FOR EACH ROW EXECUTE FUNCTION public.mark_user_data_updated();

DROP TRIGGER IF EXISTS track_user_data_activity ON public.public_share_pages;
CREATE TRIGGER track_user_data_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.public_share_pages
  FOR EACH ROW EXECUTE FUNCTION public.mark_user_data_updated();

DROP TRIGGER IF EXISTS track_user_data_activity ON public.user_settings;
CREATE TRIGGER track_user_data_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.mark_user_data_updated();

DROP TRIGGER IF EXISTS track_user_data_activity ON public.user_profiles;
CREATE TRIGGER track_user_data_activity
  AFTER UPDATE OF display_name ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.mark_user_data_updated();

-- Backfill from existing user-owned records; login timestamps are deliberately excluded.
WITH activity AS (
  SELECT user_id, max(activity_at) AS last_activity
  FROM (
    SELECT user_id, updated_at AS activity_at FROM public.tasks
    UNION ALL
    SELECT t.user_id, ti.uploaded_at FROM public.task_images ti
    JOIN public.tasks t ON t.id = ti.task_id
    UNION ALL
    SELECT user_id, created_at FROM public.tags
    UNION ALL
    SELECT user_id, updated_at FROM public.public_share_pages
    UNION ALL
    SELECT user_id, updated_at FROM public.user_settings
  ) events
  GROUP BY user_id
)
UPDATE public.user_profiles AS profile
SET last_data_updated_at = activity.last_activity
FROM activity
WHERE profile.id = activity.user_id
  AND profile.last_data_updated_at IS NULL;
