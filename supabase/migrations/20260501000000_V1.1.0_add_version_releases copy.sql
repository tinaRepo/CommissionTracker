-- ============================================================
-- Migration: バージョン管理機能の追加
-- version: 1.1.0
-- ============================================================
-- 実行順序:
-- 1. DDL（テーブル作成）
-- 2. RLS有効化
-- 3. ポリシー設定
-- 4. DML（初期データ投入）
-- ============================================================


-- ============================================================
-- 1. DDL - テーブル作成
-- ============================================================

-- リリースバージョン情報
create table if not exists public.version_releases (
  id          uuid primary key default gen_random_uuid(),
  version     text not null unique,             -- 例: "1.2.0"
  title       text not null,                   -- 例: "カレンダービュー追加"
  released_at date not null default current_date,
  created_at  timestamptz default now()
);

-- リリースの更新内容（1バージョンに対して複数登録可）
create table if not exists public.version_release_items (
  id          uuid primary key default gen_random_uuid(),
  release_id  uuid not null references public.version_releases(id) on delete cascade,
  category    text not null
                check (category in ('新機能', '改善', '修正')),
  content     text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

-- ユーザー設定（未読管理）
-- user_profiles に last_seen_release_id を持たせる方法もあるが、
-- 将来的な設定項目追加を考慮して独立テーブルとする
create table if not exists public.user_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  last_seen_release_id uuid references public.version_releases(id) on delete set null,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);


-- ============================================================
-- 2. RLS有効化
-- ============================================================

alter table public.version_releases       enable row level security;
alter table public.version_release_items  enable row level security;
alter table public.user_settings          enable row level security;


-- ============================================================
-- 3. RLSポリシー設定
-- ============================================================

-- 既存ポリシーを全削除（冪等実行のため）
drop policy if exists "releases_select_all"        on public.version_releases;
drop policy if exists "releases_insert_admin"      on public.version_releases;
drop policy if exists "releases_update_admin"      on public.version_releases;
drop policy if exists "releases_delete_admin"      on public.version_releases;
drop policy if exists "release_items_select_all"   on public.version_release_items;
drop policy if exists "release_items_insert_admin" on public.version_release_items;
drop policy if exists "release_items_update_admin" on public.version_release_items;
drop policy if exists "release_items_delete_admin" on public.version_release_items;
drop policy if exists "user_settings_own"          on public.user_settings;

-- version_releases: 全ユーザー読み取り可／管理者のみ書き込み可
create policy "releases_select_all" on public.version_releases
  for select using (true);

create policy "releases_insert_admin" on public.version_releases
  for insert with check (is_admin());

create policy "releases_update_admin" on public.version_releases
  for update using (is_admin());

create policy "releases_delete_admin" on public.version_releases
  for delete using (is_admin());

-- version_release_items: 全ユーザー読み取り可／管理者のみ書き込み可
create policy "release_items_select_all" on public.version_release_items
  for select using (true);

create policy "release_items_insert_admin" on public.version_release_items
  for insert with check (is_admin());

create policy "release_items_update_admin" on public.version_release_items
  for update using (is_admin());

create policy "release_items_delete_admin" on public.version_release_items
  for delete using (is_admin());

-- user_settings: 自分のレコードのみ操作可
create policy "user_settings_own" on public.user_settings
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- 4. DML - 既存バージョンの初期データ投入
-- ============================================================
-- handover.md のバージョン履歴をもとに初期データを投入する
-- ※ on conflict で冪等実行に対応

-- v1.0.0
insert into public.version_releases (id, version, title, released_at)
values (
  gen_random_uuid(),
  '1.0.0',
  '正式リリース',
  '2026-03-01'   -- 実際のリリース日に変更してください
) on conflict (version) do nothing;

insert into public.version_release_items (release_id, category, content, sort_order)
select id, '新機能', '正式リリース', 1
from public.version_releases where version = '1.0.0'
on conflict do nothing;

-- v1.0.1
insert into public.version_releases (id, version, title, released_at)
values (
  gen_random_uuid(),
  '1.0.1',
  'プッシュ通知・サービス紹介画面の追加',
  '2026-04-01'   -- 実際のリリース日に変更してください
) on conflict (version) do nothing;

insert into public.version_release_items (release_id, category, content, sort_order)
select id, '修正', '日付の計算処理を修正', 1
from public.version_releases where version = '1.0.1'
on conflict do nothing;

insert into public.version_release_items (release_id, category, content, sort_order)
select id, '改善', 'タイムゾーンの表示を修正', 2
from public.version_releases where version = '1.0.1'
on conflict do nothing;

insert into public.version_release_items (release_id, category, content, sort_order)
select id, '新機能', 'サービス紹介画面の追加', 3
from public.version_releases where version = '1.0.1'
on conflict do nothing;

-- v1.0.2
insert into public.version_releases (id, version, title, released_at)
values (
  gen_random_uuid(),
  '1.0.2',
  '文字入力時の自動ズームイン抑制',
  '2026-05-01'   -- 実際のリリース日に変更してください
) on conflict (version) do nothing;

insert into public.version_release_items (release_id, category, content, sort_order)
select id, '修正', '文字入力時の自動ズームインを抑制', 1
from public.version_releases where version = '1.0.2'
on conflict do nothing;

-- v1.0.3
insert into public.version_releases (id, version, title, released_at)
values (
  gen_random_uuid(),
  '1.0.3',
  'Google認証',
  '2026-06-01'   -- 実際のリリース日に変更してください
) on conflict (version) do nothing;

insert into public.version_release_items (release_id, category, content, sort_order)
select id, '新機能', 'Googleログイン対応', 1
from public.version_releases where version = '1.0.3'
on conflict do nothing;

insert into public.version_release_items (release_id, category, content, sort_order)
select id, '改善', 'パスワード再設定機能の改善', 2
from public.version_releases where version = '1.0.3'
on conflict do nothing;


-- ============================================================
-- 確認クエリ
-- ============================================================

-- テーブル確認
-- select * from version_releases order by released_at desc;
-- select ri.* from version_release_items ri
--   join version_releases r on r.id = ri.release_id
--   order by r.released_at desc, ri.sort_order;
-- select * from user_settings limit 10;

-- 最新バージョン取得
-- select * from version_releases order by released_at desc limit 1;

-- バージョン詳細（items含む）取得例
-- select
--   r.version,
--   r.title,
--   r.released_at,
--   ri.category,
--   ri.content,
--   ri.sort_order
-- from version_releases r
-- join version_release_items ri on ri.release_id = r.id
-- where r.version = '1.0.3'
-- order by ri.sort_order;
