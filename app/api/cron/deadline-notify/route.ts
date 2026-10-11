import webpush from "web-push";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient, isCronAuthorized } from "@/lib/server/admin";
import { alertAdmin, finishJobRun, pingHealthchecks, startJobRun } from "@/lib/server/monitor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const JOB = "deadline-notify";
const DAYS_AHEAD = 7;            // 納期までこの日数以内のタスクを通知
const CONCURRENCY = 10;
const TIME_BUDGET_MS = 50_000;   // maxDuration(60秒)より手前で打ち切る
const PAGE = 1000;

type Sub = { user_id: string; endpoint: string; subscription: any };
type TaskRow = { user_id: string; title: string; deadline: string };

// 毎日JST 8時に実行され、対象タスクがある通知購読ユーザーの全端末へWeb Pushを送る。
//   Authorization: Bearer <CRON_SECRET> 必須。詳細はレスポンスに含めない（ログ・job_runsのみ）
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const runId = await startJobRun(admin, JOB);
  const started = Date.now();

  // JSTの現在日時
  const jst = new Date(Date.now() + 9 * 3600_000);
  const today = jst.toISOString().slice(0, 10);
  const limitDate = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + DAYS_AHEAD))
    .toISOString().slice(0, 10);

  try {
    await cleanup(admin);

    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!
    );

    // 1) 購読を全件取得 → ユーザーごとにまとめる
    const subs = await fetchAll<Sub>(range => admin.from("push_subscriptions")
      .select("user_id, endpoint, subscription").order("user_id").range(range[0], range[1]));
    const subsByUser = new Map<string, Sub[]>();
    for (const s of subs) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s]);

    // 2) 通知を有効にしている全ユーザーを対象にする
    const targets = new Set(subsByUser.keys());

    // 3) 納期が近い未完了タスク（部分インデックス idx_tasks_active_deadline を利用）
    const tasks = targets.size === 0 ? [] : await fetchAll<TaskRow>(range => admin.from("tasks")
      .select("user_id, title, deadline")
      .gte("deadline", today).lte("deadline", limitDate)
      .not("status", "in", "(done,cancelled)")
      .order("id").range(range[0], range[1]));

    const byUser = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      if (!targets.has(t.user_id)) continue;
      byUser.set(t.user_id, [...(byUser.get(t.user_id) ?? []), t]);
    }

    // 4) 同じ日の重複送信を防ぐ（先に記録できたユーザーだけ送る）
    const userIds = Array.from(byUser.keys());
    const claimedIds = new Set<string>();
    for (let i = 0; i < userIds.length; i += 500) {
      const { data, error } = await admin.from("notification_log")
        .upsert(userIds.slice(i, i + 500).map(user_id => ({ user_id, notify_date: today })),
          { onConflict: "user_id,notify_date", ignoreDuplicates: true })
        .select("user_id");
      if (error) throw error;
      (data ?? []).forEach(r => claimedIds.add(r.user_id));
    }

    // 5) 送信（並列10・時間予算あり）
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const jobs: { sub: Sub; payload: string }[] = [];
    for (const uid of Array.from(claimedIds)) {
      const list = (byUser.get(uid) ?? []).sort((a, b) => a.deadline.localeCompare(b.deadline));
      const days = Math.round((Date.parse(list[0].deadline) - Date.parse(today)) / 86400_000);
      const when = days === 0 ? "本日" : `あと${days}日`;
      const payload = JSON.stringify({
        title: "納期が近いタスクがあります",
        body: `${list.length}件が${DAYS_AHEAD}日以内に納期です（最短: ${list[0].title}・${when}）`,
        url: appUrl,
      });
      (subsByUser.get(uid) ?? []).forEach(sub => jobs.push({ sub, payload }));
    }

    let sent = 0, failed = 0, next = 0, truncated = false;
    const worker = async () => {
      for (; ;) {
        if (Date.now() - started > TIME_BUDGET_MS) { truncated = true; return; }
        const job = jobs[next++];
        if (!job) return;
        try {
          await webpush.sendNotification(job.sub.subscription, job.payload);
          sent++;
        } catch (e: any) {
          failed++;
          // 失効した購読（404/410）は、その端末の分だけ削除する
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await admin.from("push_subscriptions").delete()
              .eq("user_id", job.sub.user_id).eq("endpoint", job.sub.endpoint);
          } else {
            console.error(`push failed for ${job.sub.user_id}:`, e?.message);
          }
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const total = sent + failed;
    const bad = truncated || (total > 0 && (sent === 0 || failed / total >= 0.5));
    const status = bad ? "partial" : "success";
    const detail = `targets=${targets.size} users=${claimedIds.size} sent=${sent} failed=${failed}${truncated ? " truncated" : ""}`;
    await finishJobRun(admin, runId, { status, sent, failed, detail });

    if (bad) {
      await alertAdmin(admin, "cron-deadline-notify", "納期通知Cronで送信異常がありました", detail);
      await pingHealthchecks("fail");
    } else {
      await pingHealthchecks("success");
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("cron deadline-notify error:", e);
    await finishJobRun(admin, runId, { status: "error", detail: String(e?.message ?? e) });
    await alertAdmin(admin, "cron-deadline-notify-error", "納期通知Cronが異常終了しました", String(e?.stack ?? e));
    await pingHealthchecks("fail");
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// ページングで全件取得（PostgRESTの max_rows=1000 対策）
async function fetchAll<T>(
  build: (range: [number, number]) => PromiseLike<{ data: any[] | null; error: any }>
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build([from, from + PAGE - 1]);
    if (error) throw error;
    all.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

// 古い記録の削除（notification_log 30日 / job_runs 90日 / stripe_events 30日）
async function cleanup(admin: ReturnType<typeof createAdminClient>) {
  const ago = (days: number) => new Date(Date.now() - days * 86400_000);
  await admin.from("notification_log").delete().lt("notify_date", ago(30).toISOString().slice(0, 10));
  await admin.from("job_runs").delete().lt("started_at", ago(90).toISOString());
  await admin.from("stripe_events").delete().lt("processed_at", ago(30).toISOString());
}
