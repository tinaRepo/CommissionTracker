"use client";

import { useEffect, useState } from "react";
import { deleteMyAccount, type Plan } from "@/lib/supabase";
import { Field, Icon } from "./TaskShared";

type Props = {
  open: boolean;
  onClose: () => void;
  email: string;
  hasPassword: boolean;
  plan: Plan;
  onDeleted: () => void; // 削除完了後（サインアウト・画面遷移）
};

// 本人によるアカウント削除（即時）。本人確認: 登録メールアドレスの入力 + パスワード
// （パスワード未設定のGoogleユーザーは、直近15分以内のログインが必要）
export default function DeleteAccountModal({ open, onClose, email, hasPassword, plan, onDeleted }: Props) {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setConfirmEmail(""); setPassword(""); setAgree(false); setError(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, busy, onClose]);

  if (!open) return null;

  const emailMatches = confirmEmail.trim().toLowerCase() === email.toLowerCase();
  const canSubmit = emailMatches && agree && (!hasPassword || password.length > 0) && !busy;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount({ confirmEmail: confirmEmail.trim(), password: hasPassword ? password : undefined });
      onDeleted();
    } catch (e: any) {
      const msg: string = e?.message ?? "削除に失敗しました";
      setError(msg === "reauth_required"
        ? "安全のため、直近のログインが必要です。いったんログアウトし、Googleで再ログインしてからもう一度お試しください。"
        : msg);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="アカウントを削除" className="modal-compact" style={{ maxWidth: 420, textAlign: "left" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 12 }}>アカウントを削除する</div>
        <div style={{
          fontSize: 13, color: "var(--danger)", lineHeight: 1.8, marginBottom: 16,
          background: "var(--danger-soft)", borderRadius: "var(--radius-md)", padding: "12px 14px",
        }}>
          <strong>この操作は取り消せません。</strong>タスク・タグ・アップロード画像・通知設定をすべて削除します。
          {plan !== "free" && (
            <><br />有料プランは<strong>今すぐ解約</strong>され、残りの期間分の返金はありません。期間の終了まで使いたい場合は、先にプラン画面から解約し、期間終了後に削除してください。</>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          <Field label={`確認のため、登録メールアドレス（${email}）を入力`}>
            <input type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} autoComplete="off" className="input" />
          </Field>
          {hasPassword && (
            <Field label="パスワード">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="input" />
            </Field>
          )}
          <label className="checkbox-row" style={{ alignItems: "flex-start" }}>
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ width: 16, height: 16, marginTop: 3 }} />
            データが完全に削除され、復元できないことを理解しました
          </label>
        </div>

        <div className="row" style={{ gap: 10, marginTop: 20 }}>
          <button onClick={onClose} disabled={busy} className="btn btn-secondary" style={{ flex: 1 }}>キャンセル</button>
          <button onClick={handleDelete} disabled={!canSubmit} className="btn btn-danger-solid" style={{ flex: 1 }}>
            {busy ? <><Icon name="refresh" size={14} /> 削除中…</> : "削除する"}
          </button>
        </div>
      </div>
    </div>
  );
}
