-- モバイル（Expo）のプッシュ通知トークン管理
-- Web版の push_subscriptions（Web Push / VAPID）とは別の仕組みのため新テーブルとして追加。
-- 1ユーザーが複数端末を持てるよう、(user_id, expo_push_token) を複合PKとする。

create table if not exists mobile_push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

comment on table mobile_push_tokens is 'Expoモバイルアプリのプッシュ通知トークン（1ユーザー複数端末対応）';

-- RLS: 本人のトークンのみ参照・登録・削除可能
alter table mobile_push_tokens enable row level security;

create policy "mobile_push_tokens_select_own"
  on mobile_push_tokens for select
  using (auth.uid() = user_id);

create policy "mobile_push_tokens_insert_own"
  on mobile_push_tokens for insert
  with check (auth.uid() = user_id);

create policy "mobile_push_tokens_update_own"
  on mobile_push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mobile_push_tokens_delete_own"
  on mobile_push_tokens for delete
  using (auth.uid() = user_id);

-- サーバー側（cron等）からは service_role キーで全件参照する想定のため、
-- service_role に対する個別ポリシーは不要（service_roleはRLSをバイパスする）。

-- updated_at 自動更新用トリガー（既存の他テーブルと同様の方式があれば合わせて差し替えてください）
create or replace function set_mobile_push_tokens_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_mobile_push_tokens_updated_at on mobile_push_tokens;
create trigger trg_mobile_push_tokens_updated_at
  before update on mobile_push_tokens
  for each row execute function set_mobile_push_tokens_updated_at();
