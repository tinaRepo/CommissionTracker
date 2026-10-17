import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { accountDeletionRequestEmail, getSupportEmail, getSupportFrom } from "@/lib/email-templates";

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
    const adminEmail = getSupportEmail();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const subjectName = displayName.replace(/[\r\n]+/g, " ").slice(0, 60);
    const email = accountDeletionRequestEmail({
      displayName: subjectName,
      email: user.email ?? null,
      userId: user.id,
      requestedAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      appUrl,
    });

    // 管理者にメール送信
    const { error: mailErr } = await resend.emails.send({
      from: getSupportFrom(),
      to: adminEmail,
      ...email,
    });

    if (mailErr) throw mailErr;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("request-delete error:", e);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
