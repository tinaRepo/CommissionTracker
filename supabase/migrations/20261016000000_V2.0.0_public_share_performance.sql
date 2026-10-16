-- Optimize per-user task counts rendered on public share pages.
CREATE INDEX IF NOT EXISTS idx_tasks_user_status
  ON public.tasks (user_id, status);
