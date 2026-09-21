-- ============================================================
-- Migration: has_password / last_login_provider カラムの追加
-- version: 1.2.0
-- 目的:
--   1. Googleのみで登録したユーザーのパスワード設定状態をDBで管理
--      （auth.identitiesはpassword設定では更新されないため）
--   2. 直近ログインしたプロバイダーをDBで管理
--      （ログイン画面はセッション確立前のため、認証後にDBへ書き込み、
--        ログイン画面はHttpOnly Cookie経由でサーバーAPIから読む）
-- ============================================================

-- 1. カラム追加
alter table user_profiles
  add column if not exists has_password boolean not null default true;

alter table user_profiles
  add column if not exists last_login_provider text;

-- 2. 既存ユーザーの初期値を補正
update user_profiles p
set has_password = false
from auth.users u
where p.id = u.id
  and (u.raw_app_meta_data->>'provider') = 'google'
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

update user_profiles p
set last_login_provider = coalesce(
  (select i.provider from auth.identities i
    where i.user_id = p.id
    order by i.last_sign_in_at desc nulls last
    limit 1),
  'email'
)
where p.last_login_provider is null;

-- 3. 新規ユーザー作成トリガーを更新
--    signup時点のprovider情報から初期値を正しく設定する
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, has_password, last_login_provider)
  values (
    new.id,
    coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'google',
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;