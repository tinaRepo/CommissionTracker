create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now(),
  unique(user_id)
);

alter table push_subscriptions enable row level security;

create policy "push_own" on push_subscriptions
  for all using (auth.uid() = user_id);