import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

// お知らせ・バージョン情報の新規作成時に、対象ユーザーの購読者へプッシュ通知を送るAPI
export async function POST(request: NextRequest) {
    try {
        // ── 呼び出し元が管理者かチェック ──
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace("Bearer ", "");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: { user: caller }, error: callerErr } = await adminSupabase.auth.getUser(token);
        if (callerErr || !caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: callerProfile } = await adminSupabase
            .from("user_profiles").select("is_admin").eq("id", caller.id).single();
        if (!callerProfile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { title, body, targetPlans, targetUserIds } = await request.json();
        if (!title || !body) {
            return NextResponse.json({ error: "title/bodyが必要です" }, { status: 400 });
        }

        // ── 対象ユーザーの絞り込み ──
        // targetUserIds指定 > targetPlans指定 > どちらも無ければ全員
        let targetUserIdList: string[] | null = null;
        if (targetUserIds && targetUserIds.length > 0) {
            targetUserIdList = targetUserIds;
        } else if (targetPlans && targetPlans.length > 0) {
            const { data: profs } = await adminSupabase
                .from("user_profiles").select("id").in("plan", targetPlans);
            targetUserIdList = (profs ?? []).map((p) => p.id);
        }

        let query = adminSupabase.from("push_subscriptions").select("user_id, subscription");
        if (targetUserIdList) query = query.in("user_id", targetUserIdList);
        const { data: subs } = await query;

        if (!subs || subs.length === 0) {
            return NextResponse.json({ sent: 0, failed: 0 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
        let sent = 0, failed = 0;

        for (const sub of subs) {
            try {
                await webpush.sendNotification(
                    sub.subscription,
                    JSON.stringify({ title, body, url: appUrl })
                );
                sent++;
            } catch (e: any) {
                failed++;
                console.error(`push failed for ${sub.user_id}:`, e.message);
                if (e.statusCode === 410) {
                    // 無効なsubscriptionは削除（cron側と同じ扱い）
                    await adminSupabase.from("push_subscriptions").delete().eq("user_id", sub.user_id);
                }
            }
        }

        return NextResponse.json({ sent, failed });
    } catch (e: any) {
        console.error("notify-push error:", e);
        return NextResponse.json({ error: e.message ?? "エラーが発生しました" }, { status: 500 });
    }
}