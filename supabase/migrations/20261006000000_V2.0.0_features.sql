-- ============================================================
-- Migration: タグ・通知時刻・監視・Stripe冪等性・DB性能
-- version: 2.1.0
-- 内容:
--   1. SECURITY DEFINER 関数の search_path 固定（Supabase Advisorsの警告対応）
--   2. 通知時刻の設定（user_settings.notify_hour）
--   3. タグ（tags / task_tags）と上限トリガー
--   4. 監視: job_runs（Cronの実行記録）
--   5. Stripe Webhookの冪等性（stripe_events）
--   6. 通知の重複送信防止（notification_log）
--   7. 性能: 部分インデックス・FKインデックス・RLSの (select auth.uid()) 化
-- 前提: 20261005000000_V2.0.1_hardening.sql が適用済みであること
-- 備考: 新規テーブルは「データAPIへ自動公開されない」前提で、必要な権限を明示的にGRANTしている
-- ============================================================


-- ------------------------------------------------------------
-- 1. search_path の固定
--    SECURITY DEFINER / 呼び出し側の search_path に依存する関数は、
--    スキーマ検索パスを悪用した関数すり替えを防ぐため固定する
-- ------------------------------------------------------------
alter function public.is_admin() set search_path = public;
alter function public.update_updated_at() set search_path = public;


-- ------------------------------------------------------------
-- 2. 通知時刻（JSTの「時」）
--    Cronは毎時0分に実行され、notify_hour が現在のJST時刻と一致するユーザーにだけ送る
-- ------------------------------------------------------------
alter table public.user_settings
  add column if not exists notify_hour smallint not null default 8
  check (notify_hour between 0 and 23);


-- ------------------------------------------------------------
-- 3. タグ
--    tags      : ユーザーごとのタグ（名前はユーザー内で一意）
--    task_tags : タスクとタグの多対多
-- ------------------------------------------------------------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 30),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create index if not exists idx_task_tags_tag_id on public.task_tags (tag_id);

alter table public.tags enable row level security;
alter table public.task_tags enable row level security;

grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.task_tags to authenticated;
grant all on public.tags to service_role;
grant all on public.task_tags to service_role;

drop policy if exists "tags_own" on public.tags;
create policy "tags_own" on public.tags
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "task_tags_select" on public.task_tags;
create policy "task_tags_select" on public.task_tags
  for select using (
    exists (select 1 from public.tasks t
      where t.id = task_tags.task_id and t.user_id = (select auth.uid()))
  );

-- 付与できるのは「自分のタスク」に「自分のタグ」だけ
drop policy if exists "task_tags_insert" on public.task_tags;
create policy "task_tags_insert" on public.task_tags
  for insert with check (
    exists (select 1 from public.tasks t
      where t.id = task_tags.task_id and t.user_id = (select auth.uid()))
    and exists (select 1 from public.tags g
      where g.id = task_tags.tag_id and g.user_id = (select auth.uid()))
  );

drop policy if exists "task_tags_delete" on public.task_tags;
create policy "task_tags_delete" on public.task_tags
  for delete using (
    exists (select 1 from public.tasks t
      where t.id = task_tags.task_id and t.user_id = (select auth.uid()))
  );

-- 上限: 1ユーザー100タグ / 1タスク10タグ（アプリ側の定数 TAG_LIMIT_* と同じ値）
create or replace function public.enforce_tag_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.tags where user_id = new.user_id) >= 100 then
    raise exception 'TAG_LIMIT:100' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_tag_limit on public.tags;
create trigger enforce_tag_limit
  before insert on public.tags
  for each row execute function public.enforce_tag_limit();

create or replace function public.enforce_task_tag_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.task_tags where task_id = new.task_id) >= 10 then
    raise exception 'TASK_TAG_LIMIT:10' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_task_tag_limit on public.task_tags;
create trigger enforce_task_tag_limit
  before insert on public.task_tags
  for each row execute function public.enforce_task_tag_limit();


-- ------------------------------------------------------------
-- 4. job_runs（Cronの実行記録。/api/health が最終成功時刻を監視に使う）
--    service_role 専用
-- ------------------------------------------------------------
create table if not exists public.job_runs (
  id          uuid primary key default gen_random_uuid(),
  job         text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running'
              check (status in ('running', 'success', 'partial', 'error')),
  sent        integer not null default 0,
  failed      integer not null default 0,
  detail      text
);

create index if not exists idx_job_runs_job_started on public.job_runs (job, started_at desc);

alter table public.job_runs enable row level security;
revoke all on public.job_runs from anon, authenticated;
grant all on public.job_runs to service_role;


-- ------------------------------------------------------------
-- 5. stripe_events（Webhookの冪等性: 同じイベントIDは1回だけ処理する）
-- ------------------------------------------------------------
create table if not exists public.stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;
grant all on public.stripe_events to service_role;


-- ------------------------------------------------------------
-- 6. notification_log（同じ日に同じユーザーへ重複送信しない）
-- ------------------------------------------------------------
create table if not exists public.notification_log (
  user_id     uuid not null references auth.users(id) on delete cascade,
  notify_date date not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, notify_date)
);

alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;
grant all on public.notification_log to service_role;


-- ------------------------------------------------------------
-- 7. 性能
-- ------------------------------------------------------------
-- 7-1. Cron用: 未完了タスクの納期検索（毎時実行されるため専用の部分インデックス）
create index if not exists idx_tasks_active_deadline
  on public.tasks (deadline)
  where deadline is not null and status not in ('done', 'cancelled');

-- 7-2. 外部キー列のインデックス（削除・結合時の全件走査を避ける）
create index if not exists idx_user_notification_status_announcement_id
  on public.user_notification_status (announcement_id);
create index if not exists idx_user_settings_last_seen_release_id
  on public.user_settings (last_seen_release_id);

-- 7-3. RLSポリシーの auth.uid() / is_admin() を (select ...) で包む
--      行ごとに関数を再評価せず、クエリ単位で1回だけ評価（initPlan化）されるようにする。
--      条件の意味は変えていない。
drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using ((select auth.uid()) = user_id);
create policy "tasks_insert" on public.tasks
  for insert with check ((select auth.uid()) = user_id);
create policy "tasks_update" on public.tasks
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "tasks_delete" on public.tasks
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "task_images_select" on public.task_images;
drop policy if exists "task_images_insert" on public.task_images;
drop policy if exists "task_images_delete" on public.task_images;
create policy "task_images_select" on public.task_images
  for select using (
    exists (select 1 from public.tasks
      where tasks.id = task_images.task_id
        and tasks.user_id = (select auth.uid())));
create policy "task_images_insert" on public.task_images
  for insert with check (
    exists (select 1 from public.tasks
      where tasks.id = task_images.task_id
        and tasks.user_id = (select auth.uid()))
    and storage_path like ((select auth.uid())::text || '/' || task_id::text || '/%'));
create policy "task_images_delete" on public.task_images
  for delete using (
    exists (select 1 from public.tasks
      where tasks.id = task_images.task_id
        and tasks.user_id = (select auth.uid())));

drop policy if exists "task_storage_select" on storage.objects;
drop policy if exists "task_storage_insert" on storage.objects;
drop policy if exists "task_storage_delete" on storage.objects;
create policy "task_storage_select" on storage.objects
  for select using (
    bucket_id = 'task-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy "task_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'task-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy "task_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'task-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "profiles_select_own" on public.user_profiles;
drop policy if exists "profiles_select_admin" on public.user_profiles;
drop policy if exists "profiles_update_admin" on public.user_profiles;
drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_select_own" on public.user_profiles
  for select using ((select auth.uid()) = id);
create policy "profiles_select_admin" on public.user_profiles
  for select using ((select public.is_admin()));
create policy "profiles_update_admin" on public.user_profiles
  for update using ((select public.is_admin()));
create policy "profiles_update_own" on public.user_profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "push_own" on public.push_subscriptions;
create policy "push_own" on public.push_subscriptions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notif_status_own" on public.user_notification_status;
create policy "notif_status_own" on public.user_notification_status
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_own" on public.user_settings;
create policy "user_settings_own" on public.user_settings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "announcements_select_targeted" on public.announcements;
create policy "announcements_select_targeted" on public.announcements
  for select using (
    (select public.is_admin())
    or (target_plans is null and target_user_ids is null)
    or (
      target_plans is not null
      and exists (
        select 1 from public.user_profiles
        where id = (select auth.uid()) and plan = any(announcements.target_plans)
      )
    )
    or (
      target_user_ids is not null
      and (select auth.uid()) = any(announcements.target_user_ids)
    )
  );


-- ============================================================
-- 確認クエリ
-- ============================================================
-- select proname, proconfig from pg_proc
--  where proname in ('is_admin','update_updated_at','handle_new_user') and pronamespace = 'public'::regnamespace;
-- select schemaname, tablename, indexname from pg_indexes
--  where indexname in ('idx_tasks_active_deadline','idx_task_tags_tag_id');
-- select tablename, policyname from pg_policies where schemaname in ('public','storage') order by 1,2;
