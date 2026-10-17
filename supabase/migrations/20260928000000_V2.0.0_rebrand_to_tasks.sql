-- ============================================================
-- Migration: 「ツクリスト」への名称変更（絵師向け→汎用納期管理）
-- version: 2.0.0
-- 目的:
--   イラスト依頼管理に限定していたテーブル・カラム・ステータス値を
--   汎用的な名称に変更する。詳細な用語対応は docs/rebrand-plan.md を参照。
-- 実行順序:
--   1. テーブルのリネーム
--   2. カラムのリネーム
--   3. ステータス・画像タイプ値の変更（CHECK制約の張り替え含む）
--   4. Storageバケットの新設・RLS再設定
--   5. RLSポリシー・インデックス・トリガー名の付け替え
-- ============================================================


-- ------------------------------------------------------------
-- 1. テーブルのリネーム
-- ------------------------------------------------------------
alter table if exists public.commissions rename to tasks;
alter table if exists public.commission_images rename to task_images;


-- ------------------------------------------------------------
-- 2. カラムのリネーム
-- ------------------------------------------------------------
-- tasks（旧commissions）
alter table public.tasks rename column artist to assignee_name;      -- 絵師名 → 依頼先名
alter table public.tasks rename column x_id to contact;              -- X ID → SNS/連絡先
alter table public.tasks rename column rough_date to submission_date;-- ラフ提出日 → 提出日

-- task_images（旧commission_images）
alter table public.task_images rename column commission_id to task_id;


-- ------------------------------------------------------------
-- 3. ステータス・画像タイプ値の変更
-- ------------------------------------------------------------

-- tasks.status: 'rough'（ラフ確認中） → 'checking'（確認中）
alter table public.tasks drop constraint if exists commissions_status_check;
update public.tasks set status = 'checking' where status = 'rough';
alter table public.tasks add constraint tasks_status_check
  check (status in ('pending','checking','progress','done','cancelled'));

-- task_images.image_type: 'rough'（ラフ） → 'preview'（確認用）
alter table public.task_images drop constraint if exists commission_images_image_type_check;
update public.task_images set image_type = 'preview' where image_type = 'rough';
alter table public.task_images add constraint task_images_image_type_check
  check (image_type in ('preview','wip','finished','other'));


-- ------------------------------------------------------------
-- 4. Storageバケットの新設・RLS再設定
-- ------------------------------------------------------------
-- ⚠ Supabase Storageはバケット名を直接renameできないため新規作成する。
--   既存の commission-images 内のオブジェクトは自動移行されない。
--   本番適用前に必ず commission-images → task-images へオブジェクトをコピーし、
--   移行完了を確認してから旧バケットを削除すること（詳細: docs/rebrand-plan.md）。
insert into storage.buckets (id, name, public)
  values ('task-images', 'task-images', false)
  on conflict (id) do nothing;

drop policy if exists "storage_select" on storage.objects;
drop policy if exists "storage_insert" on storage.objects;
drop policy if exists "storage_delete" on storage.objects;

create policy "task_storage_select" on storage.objects
  for select using (
    bucket_id = 'task-images'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "task_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'task-images'
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "task_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'task-images'
    and auth.uid()::text = (storage.foldername(name))[1]);


-- ------------------------------------------------------------
-- 5. RLSポリシー名の付け替え（tasks / task_images）
-- ------------------------------------------------------------
drop policy if exists "commissions_select" on public.tasks;
drop policy if exists "commissions_insert" on public.tasks;
drop policy if exists "commissions_update" on public.tasks;
drop policy if exists "commissions_delete" on public.tasks;

create policy "tasks_select" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update" on public.tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete" on public.tasks
  for delete using (auth.uid() = user_id);

drop policy if exists "images_select" on public.task_images;
drop policy if exists "images_insert" on public.task_images;
drop policy if exists "images_delete" on public.task_images;

create policy "task_images_select" on public.task_images
  for select using (
    exists (select 1 from public.tasks
      where tasks.id = task_images.task_id
        and tasks.user_id = auth.uid()));
create policy "task_images_insert" on public.task_images
  for insert with check (
    exists (select 1 from public.tasks
      where tasks.id = task_images.task_id
        and tasks.user_id = auth.uid()));
create policy "task_images_delete" on public.task_images
  for delete using (
    exists (select 1 from public.tasks
      where tasks.id = task_images.task_id
        and tasks.user_id = auth.uid()));


-- ------------------------------------------------------------
-- 6. インデックス・トリガー名の付け替え（cosmetic。動作自体はrenameで自動追随済み）
-- ------------------------------------------------------------
alter index if exists idx_commissions_user_id_created_at rename to idx_tasks_user_id_created_at;
alter index if exists idx_commission_images_commission_id rename to idx_task_images_task_id;

-- updated_atトリガーはテーブルrenameに自動追随するため再作成不要。名前のみ付け替える。
alter trigger commissions_updated_at on public.tasks rename to tasks_updated_at;


-- ============================================================
-- 確認クエリ
-- ============================================================
-- select * from tasks limit 10;
-- select * from task_images limit 10;
-- select distinct status from tasks;
-- select distinct image_type from task_images;
-- select bucket_id, count(*) from storage.objects where bucket_id in ('commission-images','task-images') group by bucket_id;
