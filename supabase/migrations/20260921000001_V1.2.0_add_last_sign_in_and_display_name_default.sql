-- ============================================================
-- Migration: 最終ログイン日時の記録・表示名の初期値自動設定
-- version: 1.2.2
-- 目的:
--   1. user_profilesに最終ログイン日時を保持する
--   2. 新規ユーザー作成時、メール登録は入力された表示名を、
--      Google登録はGoogleのメタデータ（full_name/name）を
--      display_nameの初期値として自動設定する
--      （これまでは編集するまでuser_profiles.display_nameが
--       NULLのままで、管理者画面で見えなかった）
-- ============================================================

-- 1. カラム追加
alter table user_profiles
  add column if not exists last_sign_in_at timestamptz;

-- 2. 新規ユーザー作成トリガーを更新
--    signup時点のprovider・メタデータから表示名の初期値を設定する
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, has_password, last_login_provider, display_name)
  values (
    new.id,
    coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'google',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. 既存ユーザーのうち、display_nameが未設定のものを遡及的に補完
--    （Google登録済みで、まだ一度も名前変更をしていないユーザー向け）
update user_profiles p
set display_name = coalesce(
  u.raw_user_meta_data->>'display_name',
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name'
)
from auth.users u
where p.id = u.id
  and p.display_name is null
  and coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ) is not null;