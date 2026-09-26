-- ============================================================
-- Migration: お知らせの配信対象（プラン別・特定ユーザー）
-- ============================================================

alter table public.announcements
  add column if not exists target_plans text[],
  add column if not exists target_user_ids uuid[];

comment on column public.announcements.target_plans is
  'NULLなら全プラン対象。値がある場合はそのプランのユーザーにのみ表示';
comment on column public.announcements.target_user_ids is
  'NULLなら対象ユーザー指定なし。値がある場合はそのuser_idのユーザーにのみ表示';

-- 既存の「全員に見せる」ポリシーを、対象を見て判定するポリシーに置き換える
drop policy if exists "announcements_select_all" on public.announcements;

create policy "announcements_select_targeted" on public.announcements
  for select using (
    is_admin()  -- 管理者は自分が作った非公開ターゲットのお知らせも管理画面で見れる必要がある
    or (target_plans is null and target_user_ids is null)  -- 全員対象
    or (
      target_plans is not null
      and exists (
        select 1 from public.user_profiles
        where id = auth.uid() and plan = any(announcements.target_plans)
      )
    )
    or (
      target_user_ids is not null
      and auth.uid() = any(announcements.target_user_ids)
    )
  );