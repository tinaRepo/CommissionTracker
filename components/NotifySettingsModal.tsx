"use client";

import { useEffect, useState } from "react";
import { DEFAULT_NOTIFY_HOUR, fetchNotifyHour, saveNotifyHour } from "@/lib/supabase";
import { Field, Icon } from "./TaskShared";

// 納期通知を受け取る時刻（JST）の設定。通知そのもののオン/オフは、ユーザーメニューの「通知」で端末ごとに切り替える。
export default function NotifySettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [hour, setHour] = useState(DEFAULT_NOTIFY_HOUR);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setLoading(true);
    fetchNotifyHour()
      .then(setHour)
      .catch(() => setMessage({ type: "error", text: "設定を読み込めませんでした" }))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await saveNotifyHour(hour);
      setMessage({ type: "ok", text: `毎日 ${hour}:00（日本時間）頃に通知します` });
    } catch {
      setMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="通知時刻を設定" className="modal-compact" style={{ maxWidth: 380, textAlign: "left" }} onClick={e => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 17 }}>通知時刻を設定</span>
          <button onClick={onClose} className="icon-btn" aria-label="閉じる"
            style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", color: "var(--fg)", width: 32, height: 32 }}>
            <Icon name="close" size={14} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
          納期が7日以内のタスクがある日に、設定した時刻にプッシュ通知でお知らせします（時刻は日本時間、毎時の0分前後に送信されます）。
        </p>
        <Field label="通知する時刻">
          <select value={hour} onChange={e => setHour(Number(e.target.value))} disabled={loading || saving} className="select">
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{h}:00{h === DEFAULT_NOTIFY_HOUR ? "（既定）" : ""}</option>
            ))}
          </select>
        </Field>
        {message && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13,
            background: message.type === "ok" ? "var(--success-soft)" : "var(--danger-soft)",
            color: message.type === "ok" ? "var(--success)" : "var(--danger)",
          }}>{message.text}</div>
        )}
        <p className="text-meta" style={{ marginTop: 12 }}>
          ※ 通知が届くのは、ユーザーメニューで「通知オン」にした端末だけです。
        </p>
        <div className="row" style={{ gap: 10, marginTop: 20 }}>
          <button onClick={onClose} disabled={saving} className="btn btn-secondary" style={{ flex: 1 }}>閉じる</button>
          <button onClick={handleSave} disabled={loading || saving} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
