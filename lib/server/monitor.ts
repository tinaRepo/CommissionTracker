import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { checkRateLimit } from "./admin";

// ============================================================
// 監視まわりの共通処理
//   - alertAdmin     : 管理者へエラーメールを送る（同じkeyは1時間に1通まで）
//   - startJobRun /
//     finishJobRun   : Cron等の実行記録（job_runs）。/api/health が最終成功時刻の監視に使う
//   - pingHealthchecks : Healthchecks.io 等の「死活監視（Dead man's switch）」へ通知（任意）
// ============================================================

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function alertAdmin(
  admin: SupabaseClient, key: string, subject: string, detail: string
): Promise<void> {
  try {
    // 同じ種類のアラートは1時間に1通まで（障害時のメール洪水を防ぐ）
    const rl = await checkRateLimit(admin, `alert:${key}`, 1, 3600);
    if (rl !== "ok") return;

    const to = process.env.ADMIN_EMAIL;
    if (!to || !process.env.RESEND_API_KEY) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "ツクリスト 監視 <onboarding@resend.dev>",
      to,
      subject: `【ツクリスト障害】${subject}`.replace(/[\r\n]+/g, " ").slice(0, 150),
      html: `<div style="font-family:sans-serif"><p>${esc(subject)}</p><pre style="background:#f5f5f7;padding:12px;border-radius:8px;white-space:pre-wrap">${esc(detail).slice(0, 4000)}</pre><p style="color:#6e6e73;font-size:12px">${esc(new Date().toISOString())}</p></div>`,
    });
  } catch (e) {
    // アラート自体の失敗でメイン処理を止めない
    console.error("alertAdmin failed:", e);
  }
}

export async function startJobRun(admin: SupabaseClient, job: string): Promise<string | null> {
  const { data, error } = await admin.from("job_runs").insert({ job }).select("id").single();
  if (error) {
    console.error("startJobRun failed:", error);
    return null;
  }
  return data.id as string;
}

export async function finishJobRun(
  admin: SupabaseClient, id: string | null,
  result: { status: "success" | "partial" | "error"; sent?: number; failed?: number; detail?: string }
): Promise<void> {
  if (!id) return;
  const { error } = await admin.from("job_runs").update({
    finished_at: new Date().toISOString(),
    status: result.status,
    sent: result.sent ?? 0,
    failed: result.failed ?? 0,
    detail: result.detail?.slice(0, 2000) ?? null,
  }).eq("id", id);
  if (error) console.error("finishJobRun failed:", error);
}

// HEALTHCHECKS_PING_URL（例: https://hc-ping.com/<uuid>）を設定すると、成功のたびにpingする。
// 一定時間pingが途切れると、Healthchecks.io 側からメール等で通知される。
export async function pingHealthchecks(kind: "success" | "fail"): Promise<void> {
  const base = process.env.HEALTHCHECKS_PING_URL;
  if (!base) return;
  try {
    await fetch(kind === "fail" ? `${base.replace(/\/$/, "")}/fail` : base, {
      method: "GET", signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("healthchecks ping failed:", e);
  }
}
