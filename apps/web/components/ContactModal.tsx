"use client";

import { useState, useEffect } from "react";
import { sharedSupabase as supabase } from "@/lib/supabase";

// ─── Props ─────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
};

// ─── スタイル定数 ───────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 13px", border: "1.5px solid #e5e7eb",
  borderRadius: 12, fontSize: 16, outline: "none", color: "#1a0a2e",
  background: "#faf8f5", boxSizing: "border-box", fontFamily: "inherit",
};

// ─── コンポーネント ─────────────────────────────────────────────

export default function ContactModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // モーダルが開くたびにリセット＋ログイン情報を自動入力
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

  // Escキーで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // スクロールロック
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
    <>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        .contact-close:hover { background: #e5e7eb !important; }
      `}</style>

      {/* オーバーレイ */}
      <div
        style={{
          position: "fixed", inset: 0, background: "#0006", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, animation: "fadeIn 0.15s ease"
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480,
            height: "calc(100vh - 32px)", maxHeight: 600, display: "flex", flexDirection: "column",
            boxShadow: "0 8px 48px #0004", animation: "slideUp 0.2s ease"
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── ヘッダー（固定） ── */}
          <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>✉️</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: "#1a0a2e" }}>お問い合わせ</span>
              </div>
              <button
                className="contact-close"
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: "none",
                  background: "#f3f4f6", cursor: "pointer", fontSize: 16, color: "#888",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>
            {!done && (
              <p style={{ fontSize: 12, color: "#aaa", margin: "6px 0 16px", lineHeight: 1.6 }}>
                ご不明な点やご要望はこちらからご連絡ください
              </p>
            )}
          </div>

          {/* ── ボディ（スクロール） ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>

            {/* 送信完了 */}
            {done ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>📨</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#1a0a2e", marginBottom: 10 }}>
                  送信しました！
                </div>
                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>
                  お問い合わせを受け付けました。<br />
                  {email && <>確認メールをお送りしました。<br /></>}
                  内容を確認次第、ご連絡いたします。
                </div>
              </div>
            ) : (
              <>
                {/* エラー */}
                {error && (
                  <div style={{
                    marginBottom: 14, padding: "10px 14px", borderRadius: 10,
                    fontSize: 13, background: "#fee2e2", color: "#b91c1c",
                    border: "1px solid #fca5a5"
                  }}>
                    ⚠ {error}
                  </div>
                )}

                <div style={{ display: "grid", gap: 14 }}>
                  <Field label="お名前 *">
                    <input
                      value={name} onChange={e => setName(e.target.value)}
                      placeholder="例: 山田 太郎"
                      readOnly={isLoggedIn && !!name}
                      style={{ ...inp, background: isLoggedIn && !!name ? "#f3f4f6" : "#faf8f5" }}
                    />
                  </Field>

                  {!isLoggedIn && (
                    <Field label="メールアドレス（任意）">
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="例: example@email.com"
                        style={inp}
                      />
                    </Field>
                  )}

                  <Field label="件名 *">
                    <input
                      value={subject} onChange={e => setSubject(e.target.value)}
                      placeholder="例: 機能についての質問"
                      style={inp}
                    />
                  </Field>

                  <Field label="本文 *">
                    <textarea
                      value={body} onChange={e => setBody(e.target.value)}
                      placeholder="お問い合わせ内容を入力してください"
                      rows={5}
                      style={{ ...inp, resize: "vertical", lineHeight: 1.7 }}
                    />
                  </Field>
                </div>

                {isLoggedIn && (
                  <p style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>
                    ※ 名前・メールアドレスはログイン情報から自動入力されています
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── フッター（固定） ── */}
          <div style={{ padding: "16px 24px 20px", flexShrink: 0 }}>
            {done ? (
              <button
                onClick={onClose}
                style={{
                  width: "100%", padding: "13px",
                  background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
                  border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer"
                }}
              >
                閉じる
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !isValid}
                style={{
                  width: "100%", padding: "13px",
                  background: loading || !isValid ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontWeight: 800, fontSize: 15,
                  cursor: loading || !isValid ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "送信中…" : "送信する"}
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 700,
        color: "#555", marginBottom: 6, letterSpacing: "0.04em"
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}
