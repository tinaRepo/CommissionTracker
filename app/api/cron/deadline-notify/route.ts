import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// VAPIDキーの設定
webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// 納期が近い依頼のユーザーにWeb Push通知を送るCron JobのAPIルート
export async function GET(request: NextRequest) {
  // Cron Jobの認証チェック
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    // 今日から7日後までの納期がある依頼を取得
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    jst.setHours(0, 0, 0, 0);
    const in7days = new Date(jst.getTime() + 7 * 24 * 60 * 60 * 1000);

    const todayStr = jst.toISOString().split("T")[0];
    const in7daysStr = in7days.toISOString().split("T")[0];

    // 納期が今日〜7日後で完成・キャンセル以外の依頼を取得
    const { data: commissions } = await adminSupabase
      .from("commissions")
      .select("user_id, title, deadline")
      .gte("deadline", todayStr)
      .lte("deadline", in7daysStr)
      .not("status", "in", '("done","cancelled")');

    if (!commissions || commissions.length === 0) {
      return NextResponse.json({ message: "No upcoming deadlines" });
    }

    // ユーザーごとに依頼をグループ化
    const byUser: Record<string, { title: string; deadline: string }[]> = {};
    for (const c of commissions) {
      if (!byUser[c.user_id]) byUser[c.user_id] = [];
      byUser[c.user_id].push({ title: c.title, deadline: c.deadline });
    }

    // 各ユーザーのpush_subscriptionを取得して通知送信
    let sent = 0;
    let failed = 0;

    for (const [userId, items] of Object.entries(byUser)) {
      const { data: sub } = await adminSupabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", userId)
        .single();

      if (!sub) continue;

      // 通知内容を作成
      const count = items.length;
      const first = items[0];
      const [dy, dm, dd] = first.deadline.split("-").map(Number);
      const deadlineDate = new Date(dy, dm - 1, dd);
      const todayLocal = new Date(jst.getFullYear(), jst.getMonth(), jst.getDate());
      const daysLeft = Math.ceil(
          (deadlineDate.getTime() - todayLocal.getTime()) / 86400000
      );

      const body = count === 1
        ? `「${first.title}」の納期まであと${daysLeft}日`
        : `納期が近い依頼が${count}件あります`;

      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: "⏰ 納期アラート",
            body,
            url: appUrl,
          })
        );
        sent++;
      } catch (e: any) {
        console.error(`Failed to send to ${userId}:`, e.message);
        // 無効なsubscriptionは削除
        if (e.statusCode === 410) {
          await adminSupabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId);
        }
        failed++;
      }
    }

    return NextResponse.json({ sent, failed });
  } catch (e: any) {
    console.error("cron error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
