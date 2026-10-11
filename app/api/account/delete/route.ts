import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, createAdminClient, getUserFromRequest } from "@/lib/server/admin";
import { deleteUserCompletely } from "@/lib/server/delete-account";

// Google専用ユーザーなど、パスワードで本人確認できない場合に許容する「直近のログイン」の時間
const RECENT_LOGIN_MS = 15 * 60 * 1000;

// 本人によるアカウント削除（即時）
//   本人確認: ① 登録メールアドレスの入力 ② パスワード設定済みならパスワード、
//   Google専用ユーザーなら直近15分以内のログイン
//   管理者アカウントは締め出し防止のため、この経路では削除できない。
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const user = await getUserFromRequest(request, admin);
    if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkRateLimit(admin, `account-delete:${user.id}`, 5, 86400);
    if (rl === "error") return NextResponse.json({ error: "現在処理できません。しばらくしてからお試しください。" }, { status: 503 });
    if (rl === "limited") return NextResponse.json({ error: "試行回数が上限に達しました。時間をおいてお試しください。" }, { status: 429 });

    const payload = await request.json().catch(() => ({}));
    const confirmEmail = typeof payload?.confirmEmail === "string" ? payload.confirmEmail.trim().toLowerCase() : "";
    const password = typeof payload?.password === "string" ? payload.password : "";

    if (confirmEmail !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "メールアドレスが一致しません" }, { status: 400 });
    }

    const { data: profile } = await admin
      .from("user_profiles").select("is_admin, has_password").eq("id", user.id).single();
    if (profile?.is_admin) {
      return NextResponse.json({ error: "管理者アカウントはこの画面から削除できません" }, { status: 403 });
    }

    if (profile?.has_password) {
      if (!password) return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error: pwErr } = await anon.auth.signInWithPassword({ email: user.email, password });
      if (pwErr) return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 403 });
    } else {
      const last = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
      if (Date.now() - last > RECENT_LOGIN_MS) {
        return NextResponse.json({ error: "reauth_required" }, { status: 403 });
      }
    }

    const result = await deleteUserCompletely(admin, user.id);
    if (!result.ok) {
      console.error(`account delete failed at ${result.stage}:`, result.error);
      return NextResponse.json(
        { error: "削除を完了できませんでした。時間をおいて再度お試しください。解決しない場合はお問い合わせください。" },
        { status: result.stage === "auth" ? 500 : 502 }
      );
    }

    // 完了メール（失敗しても削除自体は完了している）
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "ツクリスト <onboarding@resend.dev>",
          to: user.email,
          subject: "【ツクリスト】アカウントを削除しました",
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d1d1f">
            <h2 style="font-weight:600">アカウントを削除しました</h2>
            <p style="line-height:1.8">ご利用ありがとうございました。登録データ・アップロード画像・通知の宛先情報を削除し、有料プランをご利用中だった場合は解約しました。</p>
            <p style="line-height:1.8;color:#6e6e73;font-size:13px">心当たりがない場合は、お問い合わせフォームからご連絡ください。</p></div>`,
        });
      }
    } catch (e) {
      console.error("goodbye email failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("account delete error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
