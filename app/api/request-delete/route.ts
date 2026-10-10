import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// XSS防止のHTMLエスケープ（表示名・メールアドレスはユーザー入力のため必須）
function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    // トークンで呼び出し元を特定
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userErr } = await adminSupabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // レート制限: 1ユーザーあたり1日3回まで（管理者宛メールの連投防止）。
    // 判定に失敗した場合は安全側に倒して拒否する。
    const { data: allowed, error: rlErr } = await adminSupabase.rpc("check_rate_limit", {
      p_key: `request-delete:${user.id}`,
      p_limit: 3,
      p_window_seconds: 86400,
    });
    if (rlErr) {
      console.error("rate limit check failed:", rlErr);
      return NextResponse.json({ error: "現在送信できません。しばらくしてからお試しください。" }, { status: 503 });
    }
    if (allowed !== true) {
      return NextResponse.json({ error: "申請の回数が上限に達しました。時間をおいてお試しください。" }, { status: 429 });
    }

    // display_nameを取得
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const displayName = profile?.display_name ?? "（未設定）";
    const adminEmail = process.env.ADMIN_EMAIL!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const subjectName = displayName.replace(/[\r\n]+/g, " ").slice(0, 60);

    // 管理者にメール送信
    const { error: mailErr } = await resend.emails.send({
      from: "ツクリスト <onboarding@resend.dev>",
      to: adminEmail,
      subject: `【削除申請】${subjectName} さんからアカウント削除の申請が届きました`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f5f5f7; border-radius: 18px; color: #1d1d1f;">
          <h2 style="margin: 0 0 24px; font-weight: 600;">アカウント削除申請</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #6e6e73; width: 120px;">表示名</td>
              <td style="padding: 8px 0; font-weight: 600;">${esc(displayName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6e6e73;">メールアドレス</td>
              <td style="padding: 8px 0;">${esc(user.email ?? "—")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6e6e73;">ユーザーID</td>
              <td style="padding: 8px 0; color: #6e6e73; font-family: monospace; font-size: 12px;">${esc(user.id)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6e6e73;">申請日時</td>
              <td style="padding: 8px 0;">${esc(new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }))}</td>
            </tr>
          </table>
          <div style="margin-top: 28px;">
            <a href="${esc(appUrl)}/mgmt-c7f2a91e"
              style="display: inline-block; background: #0066cc; color: #fff; text-decoration: none;
                padding: 12px 24px; border-radius: 9999px; font-size: 14px;">
              管理者ページでユーザーを削除する
            </a>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #7a7a7a;">
            このメールはツクリストから自動送信されました。
          </p>
        </div>
      `,
    });

    if (mailErr) throw mailErr;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("request-delete error:", e);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
