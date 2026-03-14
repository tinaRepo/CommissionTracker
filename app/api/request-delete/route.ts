import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // display_nameを取得
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const displayName = profile?.display_name ?? "（未設定）";
    const adminEmail = process.env.ADMIN_EMAIL!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://commission-tracker-nine.vercel.app";

    // 管理者にメール送信
    const { error: mailErr } = await resend.emails.send({
      from: "Commission Tracker <onboarding@resend.dev>",
      to: adminEmail,
      subject: `【削除申請】${displayName} さんからアカウント削除の申請が届きました`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #faf8f5; border-radius: 16px;">
          <h2 style="color: #1a0a2e; margin-bottom: 24px;">🗑 アカウント削除申請</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #888; width: 120px;">表示名</td>
              <td style="padding: 8px 0; color: #1a0a2e; font-weight: bold;">${displayName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">メールアドレス</td>
              <td style="padding: 8px 0; color: #1a0a2e;">${user.email ?? "—"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">ユーザーID</td>
              <td style="padding: 8px 0; color: #666; font-family: monospace; font-size: 12px;">${user.id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888;">申請日時</td>
              <td style="padding: 8px 0; color: #1a0a2e;">${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</td>
            </tr>
          </table>
          <div style="margin-top: 28px;">
            <a href="${appUrl}/mgmt-c7f2a91e"
              style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5);
                color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px;
                font-weight: bold; font-size: 14px;">
              管理者ページでユーザーを削除する →
            </a>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #aaa;">
            このメールはCommission Trackerから自動送信されました。
          </p>
        </div>
      `,
    });

    if (mailErr) throw mailErr;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("request-delete error:", e);
    return NextResponse.json({ error: e.message ?? "送信に失敗しました" }, { status: 500 });
  }
}
