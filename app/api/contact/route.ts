import { Resend } from "resend";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// --- お問い合わせフォームのAPIエンドポイント ---
export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, body } = await request.json();

    if (!name || !subject || !body) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL!;
    const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

    const { error: mailErr } = await resend.emails.send({
      from: "Commission Tracker <onboarding@resend.dev>",
      to: adminEmail,
      ...(email ? { reply_to: email } : {}),
      subject: `【お問い合わせ】${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #faf8f5; border-radius: 16px;">
          <h2 style="color: #1a0a2e; margin-bottom: 24px;">✉️ お問い合わせ</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #888; width: 120px; vertical-align: top;">お名前</td>
              <td style="padding: 8px 0; color: #1a0a2e; font-weight: bold;">${name}</td>
            </tr>
            ${email ? `
            <tr>
              <td style="padding: 8px 0; color: #888; vertical-align: top;">メールアドレス</td>
              <td style="padding: 8px 0; color: #1a0a2e;">${email}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 8px 0; color: #888; vertical-align: top;">件名</td>
              <td style="padding: 8px 0; color: #1a0a2e;">${subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888; vertical-align: top;">本文</td>
              <td style="padding: 8px 0; color: #1a0a2e; white-space: pre-wrap;">${body}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888; vertical-align: top;">送信日時</td>
              <td style="padding: 8px 0; color: #666;">${now}</td>
            </tr>
          </table>
          ${email ? `
          <div style="margin-top: 24px; padding: 12px 16px; background: #ede9fe; border-radius: 10px; font-size: 12px; color: #7c3aed;">
            💡 このメールに返信すると ${email} 宛に届きます
          </div>` : ""}
          <p style="margin-top: 24px; font-size: 12px; color: #aaa;">
            このメールはCommission Trackerから自動送信されました。
          </p>
        </div>
      `,
    });

    if (mailErr) throw mailErr;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("contact error:", e);
    return NextResponse.json({ error: e.message ?? "送信に失敗しました" }, { status: 500 });
  }
}
