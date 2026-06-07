import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, body } = await req.json();

    // バリデーション
    if (!name?.trim() || !subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "必須項目が未入力です" }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL!;
    const appName = "Commission Tracker";
    const fromAddr = "noreply@resend.dev"; // 独自ドメイン設定後は変更

    // ── 管理者への通知メール ──────────────────────────────────
    await resend.emails.send({
      from: fromAddr,
      to: adminEmail,
      ...(email ? { replyTo: email } : {}), // 返信先をユーザーに設定
      subject: `[お問い合わせ] ${subject}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#111827">
          <div style="margin-bottom:24px">
            <div style="font-size:12px;color:#8b5cf6;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">
              Commission Tracker
            </div>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:700;color:#111827">
              📨新しいお問い合わせ
            </h1>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="background:#f9fafb;padding:14px;font-weight:600;width:120px">お名前</td>
                <td style="padding:14px">${esc(name)}</td>
              </tr>
              <tr>
                <td style="background:#f9fafb;padding:14px;font-weight:600">メール</td>
                <td style="padding:14px">${email ? esc(email) : "（未入力）"}</td>
              </tr>
              <tr>
                <td style="background:#f9fafb;padding:14px;font-weight:600">件名</td>
                <td style="padding:14px">${esc(subject)}</td>
              </tr>
            </table>
          </div>
          <div style="margin-top:20px">
            <div style="font-size:13px;font-weight:600;color:#6b7280;margin-bottom:8px">お問い合わせ内容</div>
            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:16px;line-height:1.8;white-space:pre-wrap;">${esc(body)}</div>
          </div>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${email? "返信ボタンからユーザーへ直接返信できます。": "メールアドレスは入力されていません。"}
          </div>
        </div>
      `,
    });

    // ── ユーザーへの自動返信（メールアドレスがある場合のみ）────
    if (email) {
      await resend.emails.send({
        from: fromAddr,
        to: email,
        subject: `【${appName}】お問い合わせを受け付けました`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#ffffff;">
            <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:32px 24px;border-radius:16px 16px 0 0;color:white;">
              <div style="font-size:14px;opacity:0.9">
                Commission Tracker
              </div>
              <h1 style="margin:8px 0 0;font-size:28px;line-height:1.4;color:white;">
                📨お問い合わせを受け付けました
              </h1>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
              <p style="margin:0 0 20px;color:#374151;line-height:1.9;">
                ${esc(name)} 様
              </p>
              <p style="margin:0 0 20px;color:#374151;line-height:1.9;">
                Commission Trackerをご利用いただきありがとうございます。<br>
                以下の内容でお問い合わせを受け付けました。<br>
                通常2〜3営業日以内にご返信いたします。
              </p>
              <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:18px;margin:24px 0;">
                <div style="margin-bottom:12px">
                  <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">件名</div>
                  <div style="font-weight:600;color:#111827;">${esc(subject)}</div>
                </div>
                <div>
                  <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">お問い合わせ内容</div>
                  <div style="color:#374151;line-height:1.8;white-space:pre-wrap;">${esc(body)}</div>
                </div>
              </div>
            </div>
            <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.8;">
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
