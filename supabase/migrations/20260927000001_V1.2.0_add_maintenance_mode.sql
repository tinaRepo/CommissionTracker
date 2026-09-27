create table if not exists public.app_settings (
  setting_key text primary key check (setting_key = 'maintenance'),
  maintenance_enabled boolean not null default false,
  maintenance_message text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (setting_key, maintenance_enabled, maintenance_message)
values ('maintenance', false, null)
on conflict (setting_key) do nothing;

alter table public.app_settings enable row level security;

grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;

drop policy if exists "app_settings_read_all" on public.app_settings;
create policy "app_settings_read_all" on public.app_settings
  for select using (true);

drop policy if exists "app_settings_update_admin" on public.app_settings;
create policy "app_settings_update_admin" on public.app_settings
  for update using (is_admin())
  with check (is_admin());