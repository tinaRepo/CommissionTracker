-- ============================================================
-- Migration: セキュリティ強化・サーバー側検証・複数端末プッシュ通知
-- version: 2.0.1
-- 目的:
--   1. user_profiles の特権カラム（plan / is_admin / stripe_*）をクライアントから書き換えられないようにする
--      （RLSの profiles_update_own は列を制限できず、本人が plan='premium' や is_admin=true に
--        更新できてしまうため）
--   2. 画像枚数のプラン上限をDB側でも強制する（クライアント検証のみだった）
--   3. task_images.storage_path が自分のフォルダ以外を指せないようにする
--   4. Storageバケットにファイルサイズ・MIMEタイプ制限を設定する
--   5. APIルート用のレート制限（Supabaseテーブル+RPC）
--   6. push_subscriptions を 1ユーザー複数端末に対応させる
--
-- 適用順: コードのデプロイ前に適用すること
--   （/api/contact と /api/request-delete は check_rate_limit() を呼ぶ。未適用だと503を返す）
-- 備考: 適用済みマイグレーションは編集しない。変更が必要なら新しいファイルを作る。
-- ============================================================


-- ------------------------------------------------------------
-- 1. user_profiles の特権カラム保護
--    - auth.uid() が null（service_role・SQLエディタ・内部処理）は許可
--    - 管理者は許可（管理者ページのプラン変更に使用）
--    - それ以外（一般ユーザー）は特権カラムの変更を拒否
--    display_name / has_password など本人が更新する列はそのまま更新できる
-- ------------------------------------------------------------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.is_admin is distinct from old.is_admin
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.subscription_status is distinct from old.subscription_status
  then
    raise exception 'permission denied: privileged columns are read-only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.user_profiles;
create trigger protect_profile_columns
  before update on public.user_profiles
  for each row execute function public.protect_profile_privileged_columns();


-- ------------------------------------------------------------
-- 2. 画像枚数のプラン上限をDBで強制
--    ※ 上限値は lib/supabase.ts の PLAN_LIMITS と同じ値。変更時は両方更新すること
--       free: 10 / standard: 50 / premium: 無制限
--    アカウント合計（全タスクの task_images 件数）で判定する。
--    同時アップロードの競合を避けるため、ユーザー単位でアドバイザリロックを取る。
-- ------------------------------------------------------------
create or replace function public.enforce_task_image_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid;
  v_plan  text;
  v_limit integer;
  v_count integer;
begin
  select user_id into v_user from public.tasks where id = new.task_id;
  if v_user is null then
    raise exception 'task not found' using errcode = 'P0002';
  end if;

  select plan into v_plan from public.user_profiles where id = v_user;
  v_limit := case coalesce(v_plan, 'free')
    when 'free' then 10
    when 'standard' then 50
    else null
  end;

  if v_limit is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select count(*) into v_count
  from public.task_images ti
  join public.tasks t on t.id = ti.task_id
  where t.user_id = v_user;

  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT:%:%', v_count, v_limit using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_task_image_limit on public.task_images;
create trigger enforce_task_image_limit
  before insert on public.task_images
  for each row execute function public.enforce_task_image_limit();


-- ------------------------------------------------------------
-- 3. task_images の INSERT ポリシー強化
--    storage_path は「{自分のuser_id}/{そのtask_id}/...」でなければ登録できない
--    （他人のファイルパスを自分の画像として登録されるのを防ぐ）
-- ------------------------------------------------------------
drop policy if exists "task_images_insert" on public.task_images;
create policy "task_images_insert" on public.task_images
  for insert with check (
    exists (select 1 from public.tasks
      where tasks.id = task_images.task_id
        and tasks.user_id = auth.uid())
    and storage_path like (auth.uid()::text || '/' || task_id::text || '/%')
  );


-- ------------------------------------------------------------
-- 4. Storageバケットの制限（task-images）
--    20MiB / 画像形式のみ（SVGはスクリプトを含められるため除外）
-- ------------------------------------------------------------
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'
    ]
where id = 'task-images';


-- ------------------------------------------------------------
-- 5. レート制限（固定ウィンドウ方式）
--    - テーブルは service_role 専用（RLS有効・ポリシーなし・anon/authenticatedの権限なし）
--    - check_rate_limit() は service_role のみ実行可。呼び出し側（APIルート）は
--      true=許可 / false=上限超過 として扱う
--    ※ 新規テーブルはデータAPIロールに自動公開されない場合があるため、
--       必要な権限を明示的にGRANTしている
-- ------------------------------------------------------------
create table if not exists public.api_rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (key, window_start)
);

alter table public.api_rate_limits enable row level security;

revoke all on public.api_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.api_rate_limits to service_role;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.api_rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- 古い行を確率的に掃除（専用のジョブを持たないため）
  if random() < 0.01 then
    delete from public.api_rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;


-- ------------------------------------------------------------
-- 6. push_subscriptions を複数端末対応に
--    - endpoint を生成列として持たせ、(user_id, endpoint) を一意にする
--    - 従来の unique(user_id) は廃止（1ユーザー1端末の制約を外す）
--    - 既存データはそのまま有効（endpointは subscription から自動導出される）
-- ------------------------------------------------------------
alter table public.push_subscriptions
  add column if not exists endpoint text generated always as (subscription->>'endpoint') stored;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_id_key;

create unique index if not exists push_subscriptions_user_endpoint_key
  on public.push_subscriptions (user_id, endpoint);


-- ============================================================
-- 確認クエリ
-- ============================================================
-- トリガー一覧
-- select event_object_table, trigger_name from information_schema.triggers
--  where trigger_schema = 'public' and trigger_name in ('protect_profile_columns','enforce_task_image_limit');
--
-- 特権カラム保護の確認（一般ユーザーのJWTで実行すると 42501 になること）
-- update public.user_profiles set plan = 'premium' where id = auth.uid();
--
-- バケット設定
-- select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'task-images';
--
-- レート制限（service_role のみ）
-- select public.check_rate_limit('test', 2, 60);
