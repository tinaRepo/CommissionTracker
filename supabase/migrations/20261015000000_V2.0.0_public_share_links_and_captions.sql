ALTER TABLE public.public_share_pages
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(social_links) = 'array' AND jsonb_array_length(social_links) <= 3);

UPDATE public.public_share_pages
SET social_links = jsonb_build_array(social_link)
WHERE social_link <> ''
  AND social_links = '[]'::jsonb;

ALTER TABLE public.public_share_gallery
  ADD COLUMN IF NOT EXISTS caption text NOT NULL DEFAULT ''
    CHECK (char_length(caption) <= 120);
