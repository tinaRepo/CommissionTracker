import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import {
  contactNotificationEmail,
  contactReceiptEmail,
  getNoReplyFrom,
  getSupportEmail,
  getSupportFrom,
} from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

// 入力の最大長
const MAX = { name: 100, email: 254, subject: 200, body: 5000 } as const;

// このフォームはログイン前（ログイン画面）からも使われるため認証は任意。
// ただし未認証のままメール送信の踏み台にされないよう、次の対策をしている:
//   - IP（ログイン時はユーザーID）単位 + サービス全体の2段階レート制限
//   - 自動返信は「ログイン済みで、トークンから確認できたメールアドレス」にのみ送る
//     （クライアントが送ってきたメールアドレス宛には送らない）
//   - 入力長の上限、件名の改行除去
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    const subject = typeof payload.subject === "string" ? payload.subject.replace(/[\r\n]+/g, " ").trim() : "";
    const body = typeof payload.body === "string" ? payload.body.trim() : "";

    // バリデーション
    if (!name || !subject || !body) {
      return NextResponse.json({ error: "必須項目が未入力です" }, { status: 400 });
    }
    if (name.length > MAX.name || subject.length > MAX.subject || body.length > MAX.body || email.length > MAX.email) {
      return NextResponse.json({ error: "入力が長すぎます" }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ログイン済みなら検証済みのユーザー情報を取得（無効なトークンは未認証として扱う）
    let verifiedEmail: string | null = null;
    let verifiedUserId: string | null = null;
    const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
    if (token) {
      const { data } = await admin.auth.getUser(token);
      if (data?.user) {
        verifiedUserId = data.user.id;
        verifiedEmail = data.user.email ?? null;
      }
    }

    // レート制限（判定に失敗したら安全側に倒して拒否）
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const idKey = verifiedUserId
      ? `contact:user:${verifiedUserId}`
      : `contact:ip:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
    const checks: [string, number, number][] = [
      [idKey, verifiedUserId ? 10 : 5, 3600],   // 個人: ログイン時10回/時、未ログイン5回/時
      ["contact:global", 300, 86400],           // 全体: 1日300通（Resendの送信枠の保護）
    ];
    for (const [key, limit, windowSec] of checks) {
      const { data: allowed, error: rlErr } = await admin.rpc("check_rate_limit", {
        p_key: key, p_limit: limit, p_window_seconds: windowSec,
      });
      if (rlErr) {
        console.error("rate limit check failed:", rlErr);
        return NextResponse.json({ error: "現在送信できません。しばらくしてからお試しください。" }, { status: 503 });
      }
      if (allowed !== true) {
        return NextResponse.json({ error: "送信回数が上限に達しました。時間をおいてお試しください。" }, { status: 429 });
      }
    }

    const adminEmail = getSupportEmail();
    const replyTo = verifiedEmail ?? (email || null);
    const notification = contactNotificationEmail({ name, replyTo, verifiedEmail, subject, body });

    await resend.emails.send({
      from: getSupportFrom(),
      to: adminEmail,
      ...(replyTo ? { replyTo } : {}), // 返信先をユーザーに設定
      ...notification,
    });

    if (verifiedEmail) {
      const receipt = contactReceiptEmail({ name, subject, body });
      await resend.emails.send({
        from: getNoReplyFrom(),
        to: verifiedEmail,
        ...receipt,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("contact route error:", e);
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 500 });
  }
}
