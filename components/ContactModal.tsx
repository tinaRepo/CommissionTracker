"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Field, Icon } from "@/components/TaskShared";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ContactModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
    setSubject("");
    setBody("");

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setIsLoggedIn(false);
        setName("");
        setEmail("");
        return;
      }
      setIsLoggedIn(true);
      setEmail(session.user.email ?? "");
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .single();
      if (prof?.display_name) setName(prof.display_name);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleSubmit() {
    if (!name || !subject || !body) return;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("メールアドレスの形式が正しくありません");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ name, email, subject, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "送信に失敗しました");
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const isValid = !!(name && subject && body);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 17 }}>お問い合わせ</span>
            <button onClick={onClose} className="icon-btn"
              style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", color: "var(--fg)", width: 32, height: 32 }}>
              <Icon name="close" size={14} />
            </button>
          </div>
          {!done && <p className="text-meta" style={{ margin: "6px 0 16px", lineHeight: 1.6 }}>ご不明な点やご要望はこちらからご連絡ください</p>}
        </div>

        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>送信しました</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
                お問い合わせを受け付けました。<br />
                {email && <>確認メールをお送りしました。<br /></>}
                内容を確認次第、ご連絡いたします。
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, background: "var(--danger-soft)", color: "var(--danger)" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "grid", gap: 14 }}>
                <Field label="お名前 *">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="例: 山田 太郎"
                    readOnly={isLoggedIn && !!name} className="input" style={{ background: isLoggedIn && !!name ? "var(--surface-2)" : undefined }} />
                </Field>

                {!isLoggedIn && (
                  <Field label="メールアドレス">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="例: example@email.com" className="input" />
                  </Field>
                )}

                <Field label="件名 *">
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="例: 機能についての質問" className="input" />
                </Field>

                <Field label="本文 *">
                  <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="お問い合わせ内容を入力してください" rows={5} className="textarea" />
                </Field>
              </div>

              {isLoggedIn && (
                <p className="text-meta" style={{ marginTop: 8 }}>※ 名前・メールアドレスはログイン情報から自動入力されています</p>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {done ? (
            <button onClick={onClose} className="btn btn-primary btn-block">閉じる</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !isValid} className="btn btn-primary btn-block">
              {loading ? "送信中…" : "送信する"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
