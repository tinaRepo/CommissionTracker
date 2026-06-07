-- ============================================================
-- Migration: お知らせ・バージョン管理機能の追加
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

-- ① リリースバージョン情報
create table if not exists public.version_releases (
  id          uuid primary key default gen_random_uuid(),
  version     text not null unique,
  title       text not null,
  released_at date not null default current_date,
  created_at  timestamptz default now()
);

-- ② リリースの更新内容（1バージョンに対して複数登録可）
create table if not exists public.version_release_items (
  id          uuid primary key default gen_random_uuid(),
  release_id  uuid not null references public.version_releases(id) on delete cascade,
  category    text not null
                check (category in ('新機能', '改善', '修正')),
  content     text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

-- ③ お知らせ
create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  content      text not null,
  type         text not null default 'お知らせ'
                 check (type in ('お知らせ', 'メンテナンス', '障害情報', 'キャンペーン')),
  published_at timestamptz not null default now(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ④ ユーザー通知ステータス（お知らせ既読管理）
create table if not exists public.user_notification_status (
  user_id         uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  is_read         boolean not null default false,
  created_at      timestamptz default now(),
  primary key (user_id, announcement_id)
);

-- ⑤ ユーザー設定（バージョン未読管理）
create table if not exists public.user_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  last_seen_release_id uuid references public.version_releases(id) on delete set null,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);


-- ============================================================
-- 2. RLS有効化
-- ============================================================

alter table public.version_releases          enable row level security;
alter table public.version_release_items     enable row level security;
alter table public.announcements             enable row level security;
alter table public.user_notification_status  enable row level security;
alter table public.user_settings             enable row level security;


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
drop policy if exists "announcements_select_all"   on public.announcements;
drop policy if exists "announcements_insert_admin" on public.announcements;
drop policy if exists "announcements_update_admin" on public.announcements;
drop policy if exists "announcements_delete_admin" on public.announcements;
drop policy if exists "notif_status_own"           on public.user_notification_status;
drop policy if exists "user_settings_own"          on public.user_settings;

-- version_releases: 全ユーザー読み取り可 / 管理者のみ書き込み可
create policy "releases_select_all" on public.version_releases
  for select using (true);
create policy "releases_insert_admin" on public.version_releases
  for insert with check (is_admin());
create policy "releases_update_admin" on public.version_releases
  for update using (is_admin());
create policy "releases_delete_admin" on public.version_releases
  for delete using (is_admin());

-- version_release_items: 全ユーザー読み取り可 / 管理者のみ書き込み可
create policy "release_items_select_all" on public.version_release_items
  for select using (true);
create policy "release_items_insert_admin" on public.version_release_items
  for insert with check (is_admin());
create policy "release_items_update_admin" on public.version_release_items
  for update using (is_admin());
create policy "release_items_delete_admin" on public.version_release_items
  for delete using (is_admin());

-- announcements: 全ユーザー読み取り可 / 管理者のみ書き込み可
create policy "announcements_select_all" on public.announcements
  for select using (true);
create policy "announcements_insert_admin" on public.announcements
  for insert with check (is_admin());
create policy "announcements_update_admin" on public.announcements
  for update using (is_admin());
create policy "announcements_delete_admin" on public.announcements
  for delete using (is_admin());

-- user_notification_status: 自分のレコードのみ操作可
create policy "notif_status_own" on public.user_notification_status
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_settings: 自分のレコードのみ操作可
create policy "user_settings_own" on public.user_settings
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- 4. DML - 初期データ投入
-- ============================================================
-- ※ on conflict で冪等実行に対応

-- バージョン履歴
insert into public.version_releases (version, title, released_at) values
  ('1.0.0', '正式リリース',                         '2025-01-01'),   -- 実際の日付に変更してください
  ('1.0.1', 'タイムゾーン修正・カレンダービュー追加', '2025-01-01'),
  ('1.0.2', '文字入力時の自動ズームイン抑制',         '2025-01-01'),
  ('1.0.3', 'Google認証対応',                        '2025-01-01'),
  ('1.1.0', 'お知らせ・バージョン管理機能追加',       current_date)
on conflict (version) do nothing;

-- v1.0.0 更新内容
insert into public.version_release_items (release_id, category, content, sort_order)
select id, '新機能', '正式リリース', 1
from public.version_releases where version = '1.0.0'
on conflict do nothing;

-- v1.0.1 更新内容
insert into public.version_release_items (release_id, category, content, sort_order)
select id, col.category, col.content, col.sort_order
from public.version_releases,
  (values
    ('修正',  'タイムゾーン修正',       1),
    ('改善',  'ガイドページ更新',       2),
    ('新機能', 'カレンダービュー追加',   3)
  ) as col(category, content, sort_order)
where version = '1.0.1'
on conflict do nothing;

-- v1.0.2 更新内容
insert into public.version_release_items (release_id, category, content, sort_order)
select id, '修正', '文字入力時の自動ズームインを抑制', 1
from public.version_releases where version = '1.0.2'
on conflict do nothing;

-- v1.0.3 更新内容
insert into public.version_release_items (release_id, category, content, sort_order)
select id, '新機能', 'Googleログイン対応', 1
from public.version_releases where version = '1.0.3'
on conflict do nothing;

-- v1.1.0 更新内容
insert into public.version_release_items (release_id, category, content, sort_order)
select id, col.category, col.content, col.sort_order
from public.version_releases,
  (values
    ('新機能', 'お知らせ一覧・詳細画面の追加', 1),
    ('新機能', 'リリースノートのDB管理',       2),
    ('新機能', '未読バッジ通知',               3)
  ) as col(category, content, sort_order)
where version = '1.1.0'
on conflict do nothing;

-- お知らせ初期データ（サンプル）
insert into public.announcements (title, content, type, published_at)
values (
  'Commission Tracker をリリースしました',
  'イラスト依頼を一元管理できるサービスをリリースしました。ご利用いただきありがとうございます。ご意見・ご要望はお問い合わせフォームからお気軽にどうぞ。',
  'お知らせ',
  now()
);


-- ============================================================
-- 確認クエリ
-- ============================================================

-- バージョン一覧
-- select * from version_releases order by released_at desc;

-- バージョン詳細（items含む）
-- select r.version, r.title, r.released_at, ri.category, ri.content, ri.sort_order
-- from version_releases r
-- join version_release_items ri on ri.release_id = r.id
-- order by r.released_at desc, ri.sort_order;

-- お知らせ一覧
-- select * from announcements order by published_at desc;

-- ユーザーの未読お知らせ件数取得例
-- select count(*) from announcements a
-- left join user_notification_status s
--   on s.announcement_id = a.id and s.user_id = auth.uid()
-- where s.is_read is null or s.is_read = false;

-- バージョン未読確認例（最新 ≠ last_seen で未読）
-- select (
--   (select id from version_releases order by released_at desc limit 1)
--   !=
--   (select last_seen_release_id from user_settings where user_id = auth.uid())
-- ) as has_unread_release;
