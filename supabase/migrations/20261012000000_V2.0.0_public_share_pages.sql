-- Private share configuration. Public access is mediated by the server API only.
CREATE TABLE IF NOT EXISTS public.public_share_pages (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  show_accepting_status boolean NOT NULL DEFAULT false,
  accepting_requests boolean NOT NULL DEFAULT false,
  show_active_count boolean NOT NULL DEFAULT false,
  show_completed_count boolean NOT NULL DEFAULT false,
  show_capacity boolean NOT NULL DEFAULT false,
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity BETWEEN 0 AND 1000),
  show_display_name boolean NOT NULL DEFAULT false,
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 80),
  show_bio boolean NOT NULL DEFAULT false,
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 500),
  show_social_link boolean NOT NULL DEFAULT false,
  social_link text NOT NULL DEFAULT '' CHECK (char_length(social_link) <= 2048),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_share_pages ENABLE ROW LEVEL SECURITY;

-- No client policies: the service-role API verifies the owner and only returns
-- explicitly enabled public fields.
REVOKE ALL ON TABLE public.public_share_pages FROM anon, authenticated;
GRANT ALL ON TABLE public.public_share_pages TO service_role;
