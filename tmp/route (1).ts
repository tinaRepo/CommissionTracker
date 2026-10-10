import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient, isCronAuthorized } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cronが正常に動いているとみなす最大間隔（毎時実行 + 余裕）
const CRON_MAX_AGE_MINUTES = 150;

// 死活監視用エンドポイント（UptimeRobot / Better Stack / Healthchecks 等から呼ぶ）
//   GET /api/health            : アプリとDBに到達できれば200（認証不要。詳細は返さない）
//   GET /api/health?deep=1     : 加えてCronの最終成功時刻を確認する（Authorization: Bearer <CRON_SECRET> が必要）
//                                最終成功が古い・失敗している場合は503 → 監視側でアラートにする
export async function GET(request: NextRequest) {
  const deep = request.nextUrl.searchParams.get("deep") === "1";

  // --- DBへの到達性（匿名キーで公開テーブルを1行読む） ---
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: dbError } = await anon.from("app_settings").select("setting_key").limit(1);
  if (dbError) {
    console.error("health: db check failed:", dbError.message);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  if (!deep) {
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: lastRun, error } = await admin
    .from("job_runs")
    .select("status, started_at, finished_at, sent, failed")
    .eq("job", "deadline-notify")
    .in("status", ["success", "partial"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("health: job_runs query failed:", error.message);
    return NextResponse.json({ ok: false, error: "job_runs" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const ageMinutes = lastRun ? Math.round((Date.now() - new Date(lastRun.started_at).getTime()) / 60000) : null;
  const cronOk = ageMinutes !== null && ageMinutes <= CRON_MAX_AGE_MINUTES;

  return NextResponse.json(
    { ok: cronOk, db: true, cron: { lastSuccessAgeMinutes: ageMinutes, maxAgeMinutes: CRON_MAX_AGE_MINUTES, last: lastRun } },
    { status: cronOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
