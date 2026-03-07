-- ============================================================
-- Commission Tracker - Supabase Schema (プラン制限・管理者対応版)
-- SupabaseのSQL Editorに貼り付けて実行してください
-- ============================================================

-- ============================================================
-- プラン定義
--   free      : 合計 10枚まで
--   standard  : 合計 50枚まで
--   premium   : 無制限
-- ============================================================

-- ユーザープロフィール（プラン情報）
create table if not exists user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  plan        text not null default 'free'
                check (plan in ('free','standard','premium')),
  is_admin    boolean not null default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 新規ユーザー登録時に自動でprofileを作成するトリガー
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into user_profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- updated_at自動更新
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_profiles_updated_at on user_profiles;
create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at();

-- commissionsテーブル
create table if not exists commissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  artist      text not null,
  x_id        text,
  ordered_at  date,
  deadline    date,
  price       numeric,
  currency    text default 'JPY',
  status      text default 'pending'
                check (status in ('pending','rough','progress','done','cancelled')),
  rough_date  date,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

drop trigger if exists commissions_updated_at on commissions;
create trigger commissions_updated_at
  before update on commissions
  for each row execute function update_updated_at();

-- commission_imagesテーブル
create table if not exists commission_images (
  id              uuid primary key default gen_random_uuid(),
  commission_id   uuid not null references commissions(id) on delete cascade,
  storage_path    text not null,
  file_name       text not null,
  image_type      text default 'rough'
                    check (image_type in ('rough','wip','finished','other')),
  uploaded_at     timestamptz default now()
);

-- ============================================================
-- RLS設定
-- ============================================================
alter table user_profiles enable row level security;
alter table commissions enable row level security;
alter table commission_images enable row level security;

-- user_profiles: 自分のプロフィールは読める / 管理者は全員読める・更新できる
drop policy if exists "profiles_select_own" on user_profiles;
drop policy if exists "profiles_select_admin" on user_profiles;
drop policy if exists "profiles_update_admin" on user_profiles;

create policy "profiles_select_own" on user_profiles
  for select using (auth.uid() = id);

create policy "profiles_select_admin" on user_profiles
  for select using (
    exists (select 1 from user_profiles where id = auth.uid() and is_admin = true)
  );

create policy "profiles_update_admin" on user_profiles
  for update using (
    exists (select 1 from user_profiles where id = auth.uid() and is_admin = true)
  );

-- commissions: 自分のデータのみ
drop policy if exists "commissions_select" on commissions;
drop policy if exists "commissions_insert" on commissions;
drop policy if exists "commissions_update" on commissions;
drop policy if exists "commissions_delete" on commissions;

create policy "commissions_select" on commissions
  for select using (auth.uid() = user_id);
create policy "commissions_insert" on commissions
  for insert with check (auth.uid() = user_id);
create policy "commissions_update" on commissions
  for update using (auth.uid() = user_id);
create policy "commissions_delete" on commissions
  for delete using (auth.uid() = user_id);

-- commission_images: commissionオーナーのみ
drop policy if exists "images_select" on commission_images;
drop policy if exists "images_insert" on commission_images;
drop policy if exists "images_delete" on commission_images;

create policy "images_select" on commission_images
  for select using (
    exists (select 1 from commissions
      where commissions.id = commission_images.commission_id
        and commissions.user_id = auth.uid()));
create policy "images_insert" on commission_images
  for insert with check (
    exists (select 1 from commissions
      where commissions.id = commission_images.commission_id
        and commissions.user_id = auth.uid()));
create policy "images_delete" on commission_images
  for delete using (
    exists (select 1 from commissions
      where commissions.id = commission_images.commission_id
        and commissions.user_id = auth.uid()));

-- ============================================================
-- Storage バケット & RLS
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('commission-images', 'commission-images', false)
  on conflict (id) do nothing;

drop policy if exists "storage_select" on storage.objects;
drop policy if exists "storage_insert" on storage.objects;
drop policy if exists "storage_delete" on storage.objects;

create policy "storage_select" on storage.objects
  for select using (
    bucket_id = 'commission-images'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'commission-images'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "storage_delete" on storage.objects
  for delete using (
    bucket_id = 'commission-images'
    and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 管理者ユーザーの設定方法
-- 以下のSQLのUIDを自分のUIDに変えて実行してください
-- （SupabaseのAuthentication > Users からUIDを確認できます）
-- ============================================================
-- update user_profiles set is_admin = true where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
