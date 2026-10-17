ALTER TABLE public.public_share_pages
  ADD COLUMN IF NOT EXISTS show_portfolio boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.public_share_gallery (
  user_id uuid NOT NULL REFERENCES public.public_share_pages(user_id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.task_images(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 19),
  PRIMARY KEY (user_id, image_id),
  UNIQUE (user_id, sort_order)
);

ALTER TABLE public.public_share_gallery ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.public_share_gallery FROM anon, authenticated;
GRANT ALL ON TABLE public.public_share_gallery TO service_role;
