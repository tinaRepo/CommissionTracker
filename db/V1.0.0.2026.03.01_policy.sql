-- ============================================================
-- Commission Tracker - RLSポリシー & トリガー設定
-- ============================================================
-- このファイルをSupabase SQL Editorで実行してください。
-- schema.sqlを実行した後に実行する必要があります。
-- ============================================================


-- ------------------------------------------------------------
-- 1. 既存ポリシーを全削除（冪等に実行できるようにするため）
-- ------------------------------------------------------------
drop policy if exists "profiles_select_own" on user_profiles;
drop policy if exists "profiles_select_admin" on user_profiles;
drop policy if exists "profiles_update_admin" on user_profiles;
drop policy if exists "profiles_update_own" on user_profiles;


-- ------------------------------------------------------------
-- 2. 管理者判定関数
--    security definer により RLS をバイパスして実行されるため
--    ポリシー内で user_profiles を参照しても無限再帰が起きない
-- ------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid() and is_admin = true
  );
$$;


-- ------------------------------------------------------------
-- 3. user_profiles のRLSポリシー
-- ------------------------------------------------------------

-- 自分自身のプロフィールを読み取れる
create policy "profiles_select_own" on user_profiles
  for select using (auth.uid() = id);

-- 管理者は全ユーザーのプロフィールを読み取れる（管理者ページのユーザー一覧に使用）
create policy "profiles_select_admin" on user_profiles
  for select using (is_admin());

-- 管理者は全ユーザーのプロフィールを更新できる（プラン変更に使用）
create policy "profiles_update_admin" on user_profiles
  for update using (is_admin());

-- 自分自身のプロフィールを更新できる（表示名の変更に使用）
-- with check により、自分のIDを書き換えて他人になりすますのを防ぐ
create policy "profiles_update_own" on user_profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);


-- ------------------------------------------------------------
-- 4. 新規ユーザー登録時に user_profiles を自動作成するトリガー
--    auth.users にレコードが挿入されると自動で実行される
--    on conflict (id) do nothing により二重登録を防ぐ
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 既存トリガーを削除してから再作成（冪等に実行できるようにするため）
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
