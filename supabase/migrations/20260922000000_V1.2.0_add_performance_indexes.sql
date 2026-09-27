-- ============================================================
-- Migration: パフォーマンス改善のためのインデックス追加
-- version: 1.2.3
-- 目的:
--   PostgreSQLは外部キー列に自動でインデックスを作成しないため、
--   以下のテーブルはデータ量が増えるとRLSのフィルタ・ソートが
--   遅くなっていく可能性がある。既存のテーブル定義・カラムは
--   一切変更せず、インデックスの追加のみを行う（非破壊的変更）。
--
--   - commissions.user_id: 全RLSポリシー（commissions_select等）で
--     auth.uid() = user_id によるフィルタに使われる。
--     fetchCommissions() は created_at desc でソートするため、
--     (user_id, created_at desc) の複合インデックスにして
--     フィルタ+ソートを1インデックススキャンで完結させる。
--   - commission_images.commission_id: RLS（images_select等）や
--     fetchCommissions() の埋め込み取得（images:commission_images(*)）で
--     結合条件として使われる。
--   - announcements.published_at / version_releases.released_at:
--     一覧表示時に order by で使われるため、将来的なレコード増加に備える。
-- ============================================================

create index if not exists idx_commissions_user_id_created_at
  on public.commissions (user_id, created_at desc);

create index if not exists idx_commission_images_commission_id
  on public.commission_images (commission_id);

create index if not exists idx_announcements_published_at
  on public.announcements (published_at desc);

create index if not exists idx_version_releases_released_at
  on public.version_releases (released_at desc);

create index if not exists idx_version_release_items_release_id
  on public.version_release_items (release_id);

-- ============================================================
-- 確認クエリ
-- ============================================================
-- select tablename, indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename in ('commissions', 'commission_images', 'announcements', 'version_releases', 'version_release_items')
-- order by tablename, indexname;
