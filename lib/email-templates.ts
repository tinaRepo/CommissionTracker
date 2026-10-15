function requiredEmail(name: "SUPPORT_EMAIL" | "NOREPLY_EMAIL"): string {
  const email = process.env[name];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${name} must be set to a valid email address`);
  }
  return email;
}

export function getSupportEmail(): string {
  return requiredEmail("SUPPORT_EMAIL");
}

export function getSupportFrom(): string {
  return `ツクリスト サポート <${getSupportEmail()}>`;
}

export function getNoReplyFrom(): string {
  return `ツクリスト <${requiredEmail("NOREPLY_EMAIL")}>`;
}

const APP_NAME = "ツクリスト";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function contactNotificationEmail(input: {
  name: string;
  replyTo: string | null;
  verifiedEmail: string | null;
  subject: string;
  body: string;
}) {
  const { name, replyTo, verifiedEmail, subject, body } = input;
  return {
    subject: `[お問い合わせ] ${subject}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#1d1d1f">
        <div style="margin-bottom:24px">
          <div style="font-size:12px;color:#6e6e73;font-weight:600">${APP_NAME}</div>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:600;color:#1d1d1f">新しいお問い合わせ</h1>
        </div>
        <div style="border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="background:#f5f5f7;padding:14px;font-weight:600;width:120px">お名前</td><td style="padding:14px">${esc(name)}</td></tr>
            <tr><td style="background:#f5f5f7;padding:14px;font-weight:600">メール</td><td style="padding:14px">${replyTo ? esc(replyTo) : "（未入力）"}${verifiedEmail ? "（ログイン確認済み）" : replyTo ? "（未確認）" : ""}</td></tr>
            <tr><td style="background:#f5f5f7;padding:14px;font-weight:600">件名</td><td style="padding:14px">${esc(subject)}</td></tr>
          </table>
        </div>
        <div style="margin-top:20px">
          <div style="font-size:13px;font-weight:600;color:#6e6e73;margin-bottom:8px">お問い合わせ内容</div>
          <div style="background:#fafafc;border:1px solid #e0e0e0;border-radius:12px;padding:16px;line-height:1.8;white-space:pre-wrap;">${esc(body)}</div>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:12px;color:#6e6e73;">${replyTo ? "返信ボタンからユーザーへ直接返信できます。" : "メールアドレスは入力されていません。"}</div>
      </div>
    `,
  };
}

export function contactReceiptEmail(input: { name: string; subject: string; body: string }) {
  const { name, subject, body } = input;
  return {
    subject: `【${APP_NAME}】お問い合わせを受け付けました`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#ffffff;color:#1d1d1f;">
        <div style="background:#272729;padding:32px 24px;border-radius:18px 18px 0 0;color:#ffffff;">
          <div style="font-size:14px;opacity:0.8">${APP_NAME}</div>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.4;font-weight:600;color:#ffffff;">お問い合わせを受け付けました</h1>
        </div>
        <div style="border:1px solid #e0e0e0;border-top:none;border-radius:0 0 18px 18px;padding:24px;">
          <p style="margin:0 0 20px;line-height:1.9;">${esc(name)} 様</p>
          <p style="margin:0 0 20px;line-height:1.9;">${APP_NAME}をご利用いただきありがとうございます。<br>以下の内容でお問い合わせを受け付けました。<br>通常2〜3営業日以内にご返信いたします。</p>
          <div style="background:#f5f5f7;border-radius:12px;padding:18px;margin:24px 0;">
            <div style="margin-bottom:12px"><div style="font-size:12px;color:#6e6e73;margin-bottom:4px;">件名</div><div style="font-weight:600;">${esc(subject)}</div></div>
            <div><div style="font-size:12px;color:#6e6e73;margin-bottom:4px;">お問い合わせ内容</div><div style="line-height:1.8;white-space:pre-wrap;">${esc(body)}</div></div>
          </div>
        </div>
        <p style="margin:24px 0 0;color:#6e6e73;font-size:13px;line-height:1.8;">このメールは自動送信されています。<br>本メールへの返信には対応しておりません。</p>
      </div>
    `,
  };
}

export function accountDeletionRequestEmail(input: {
  displayName: string;
  email: string | null;
  userId: string;
  requestedAt: string;
  appUrl: string;
}) {
  const { displayName, email, userId, requestedAt, appUrl } = input;
  return {
    subject: `【削除申請】${displayName} さんからアカウント削除の申請が届きました`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f5f5f7;border-radius:18px;color:#1d1d1f;">
        <h2 style="margin:0 0 24px;font-weight:600;">アカウント削除申請</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6e6e73;width:120px;">表示名</td><td style="padding:8px 0;font-weight:600;">${esc(displayName)}</td></tr>
          <tr><td style="padding:8px 0;color:#6e6e73;">メールアドレス</td><td style="padding:8px 0;">${esc(email ?? "—")}</td></tr>
          <tr><td style="padding:8px 0;color:#6e6e73;">ユーザーID</td><td style="padding:8px 0;color:#6e6e73;font-family:monospace;font-size:12px;">${esc(userId)}</td></tr>
          <tr><td style="padding:8px 0;color:#6e6e73;">申請日時</td><td style="padding:8px 0;">${esc(requestedAt)}</td></tr>
        </table>
        <div style="margin-top:28px;"><a href="${esc(appUrl)}/mgmt-c7f2a91e" style="display:inline-block;background:#0066cc;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-size:14px;">管理者ページでユーザーを削除する</a></div>
        <p style="margin-top:24px;font-size:12px;color:#7a7a7a;">このメールはツクリストから自動送信されました。</p>
      </div>
    `,
  };
}

export function accountDeletedEmail() {
  return {
    subject: "【ツクリスト】アカウントを削除しました",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d1d1f">
      <h2 style="font-weight:600">アカウントを削除しました</h2>
      <p style="line-height:1.8">ご利用ありがとうございました。登録データ・アップロード画像・通知の宛先情報を削除し、有料プランをご利用中だった場合は解約しました。</p>
      <p style="line-height:1.8;color:#6e6e73;font-size:13px">心当たりがない場合は、お問い合わせフォームからご連絡ください。</p></div>`,
  };
}

export function paymentFailedEmail(appUrl: string) {
  return {
    subject: "【ツクリスト】お支払いを確認できませんでした",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d1d1f">
      <h2 style="font-weight:600">お支払いを確認できませんでした</h2>
      <p style="line-height:1.8">有料プランの更新時のお支払いが完了しませんでした。カードの有効期限や利用限度額をご確認のうえ、お支払い方法を更新してください。しばらく更新されない場合、プランは無料プランに戻ります。</p>
      <p style="margin:24px 0"><a href="${esc(appUrl)}/pricing" style="display:inline-block;background:#0066cc;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px">お支払い方法を更新する</a></p>
      <p style="color:#6e6e73;font-size:12px">ログイン後、プラン画面の「プラン・支払い管理」から更新できます。</p></div>`,
  };
}

export function adminAlertEmail(subject: string, detail: string, timestamp: string) {
  return {
    subject: `【ツクリスト障害】${subject}`.replace(/[\r\n]+/g, " ").slice(0, 150),
    html: `<div style="font-family:sans-serif"><p>${esc(subject)}</p><pre style="background:#f5f5f7;padding:12px;border-radius:8px;white-space:pre-wrap">${esc(detail).slice(0, 4000)}</pre><p style="color:#6e6e73;font-size:12px">${esc(timestamp)}</p></div>`,
  };
}
