import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

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

    const adminEmail = process.env.ADMIN_EMAIL!;
    const appName = "ツクリスト";
    const fromAddr = "noreply@resend.dev"; // 独自ドメイン設定後は変更
    const replyTo = verifiedEmail ?? (email || null);

    // ── 管理者への通知メール ──────────────────────────────────
    await resend.emails.send({
      from: fromAddr,
      to: adminEmail,
      ...(replyTo ? { replyTo } : {}), // 返信先をユーザーに設定
      subject: `[お問い合わせ] ${subject}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1d1d1f">
          <div style="margin-bottom:24px">
            <div style="font-size:12px;color:#6e6e73;font-weight:600">
              ${appName}
            </div>
            <h1 style="margin:8px 0 0;font-size:24px;font-weight:600;color:#1d1d1f">
              新しいお問い合わせ
            </h1>
          </div>
          <div style="border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="background:#f5f5f7;padding:14px;font-weight:600;width:120px">お名前</td>
                <td style="padding:14px">${esc(name)}</td>
              </tr>
              <tr>
                <td style="background:#f5f5f7;padding:14px;font-weight:600">メール</td>
                <td style="padding:14px">${replyTo ? esc(replyTo) : "（未入力）"}${verifiedEmail ? "（ログイン確認済み）" : replyTo ? "（未確認）" : ""}</td>
              </tr>
              <tr>
                <td style="background:#f5f5f7;padding:14px;font-weight:600">件名</td>
                <td style="padding:14px">${esc(subject)}</td>
              </tr>
            </table>
          </div>
          <div style="margin-top:20px">
            <div style="font-size:13px;font-weight:600;color:#6e6e73;margin-bottom:8px">お問い合わせ内容</div>
            <div style="background:#fafafc;border:1px solid #e0e0e0;border-radius:12px;padding:16px;line-height:1.8;white-space:pre-wrap;">${esc(body)}</div>
          </div>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:12px;color:#6e6e73;">${replyTo ? "返信ボタンからユーザーへ直接返信できます。" : "メールアドレスは入力されていません。"}
          </div>
        </div>
      `,
    });

    // ── ユーザーへの自動返信（ログイン済みで、メールアドレスを確認できた場合のみ）────
    if (verifiedEmail) {
      await resend.emails.send({
        from: fromAddr,
        to: verifiedEmail,
        subject: `【${appName}】お問い合わせを受け付けました`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#ffffff;color:#1d1d1f;">
            <div style="background:#272729;padding:32px 24px;border-radius:18px 18px 0 0;color:#ffffff;">
              <div style="font-size:14px;opacity:0.8">
                ${appName}
              </div>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.4;font-weight:600;color:#ffffff;">
                お問い合わせを受け付けました
              </h1>
            </div>
            <div style="border:1px solid #e0e0e0;border-top:none;border-radius:0 0 18px 18px;padding:24px;">
              <p style="margin:0 0 20px;line-height:1.9;">
                ${esc(name)} 様
              </p>
              <p style="margin:0 0 20px;line-height:1.9;">
                ${appName}をご利用いただきありがとうございます。<br>
                以下の内容でお問い合わせを受け付けました。<br>
                通常2〜3営業日以内にご返信いたします。
              </p>
              <div style="background:#f5f5f7;border-radius:12px;padding:18px;margin:24px 0;">
                <div style="margin-bottom:12px">
                  <div style="font-size:12px;color:#6e6e73;margin-bottom:4px;">件名</div>
                  <div style="font-weight:600;">${esc(subject)}</div>
                </div>
                <div>
                  <div style="font-size:12px;color:#6e6e73;margin-bottom:4px;">お問い合わせ内容</div>
                  <div style="line-height:1.8;white-space:pre-wrap;">${esc(body)}</div>
                </div>
              </div>
            </div>
            <p style="margin:24px 0 0;color:#6e6e73;font-size:13px;line-height:1.8;">
              このメールは自動送信されています。<br>
              本メールへの返信には対応しておりません。
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("contact route error:", e);
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 500 });
  }
}

/** XSS防止のHTMLエスケープ */
function esc(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
