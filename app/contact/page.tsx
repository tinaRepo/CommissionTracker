"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- ログイン状態の確認とユーザープロフィールの取得 ---
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setIsLoggedIn(true);
      setEmail(session.user.email ?? "");
      // display_nameを取得
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .single();
      if (prof?.display_name) setName(prof.display_name);
    });
  }, []);

  // --- フォーム送信処理 ---
  async function handleSubmit() {
    if (!name || !subject || !body) return;
    // メールアドレスが入力されている場合は形式チェック
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
          ...(session ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ name, email, subject, body }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "送信に失敗しました");
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const isValid = name && subject && body;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 55%,#1a2a4a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
      padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, padding: "40px 36px",
        width: "100%", maxWidth: 480,
        boxShadow: "0 20px 60px #0006, 0 0 0 1px #ffffff10",
      }}>
        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 38, marginBottom: 6 }}>✉️</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#1a0a2e" }}>お問い合わせ</div>
          <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>
            ご不明な点やご要望はこちらからご連絡ください
          </div>
        </div>

        {done ? (
          /* 送信完了 */
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📨</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#1a0a2e", marginBottom: 12 }}>
              送信しました！
            </div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 28 }}>
              お問い合わせを受け付けました。<br />
              内容を確認次第、ご連絡いたします。
            </div>
            <button onClick={() => window.location.href = isLoggedIn ? "/" : "/login"}
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
                border: "none", borderRadius: 12, padding: "12px 32px",
                fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {isLoggedIn ? "トップに戻る" : "ログインページへ"}
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13,
                background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gap: 16 }}>
              <Field label="お名前 *">
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="例: 山田 太郎"
                  readOnly={isLoggedIn && !!name}
                  style={{ ...inp, background: isLoggedIn && !!name ? "#f3f4f6" : "#faf8f5" }} />
              </Field>
              {!isLoggedIn && (
                <Field label="メールアドレス（任意）">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="例: example@email.com"
                    style={inp} />
                </Field>
              )}
              <Field label="件名 *">
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="例: 機能についての質問"
                  style={inp} />
              </Field>
              <Field label="本文 *">
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  placeholder="お問い合わせ内容を入力してください"
                  style={{ ...inp, minHeight: 120, resize: "vertical" }} />
              </Field>
            </div>

            {isLoggedIn && (
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>
                ※ 名前・メールアドレスはログイン情報から自動入力されています
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading || !isValid}
              style={{
                width: "100%", padding: "13px", marginTop: 24,
                background: loading || !isValid
                  ? "#c4b5fd"
                  : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                color: "#fff", border: "none", borderRadius: 12,
                fontWeight: 800, fontSize: 15,
                cursor: loading || !isValid ? "not-allowed" : "pointer",
              }}>
              {loading ? "送信中…" : "送信する"}
            </button>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button onClick={() => window.location.href = isLoggedIn ? "/" : "/login"}
                style={{ background: "none", border: "none", color: "#888",
                  fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
                {isLoggedIn ? "← トップに戻る" : "← ログインページに戻る"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #e5e7eb",
  borderRadius: 12, fontSize: 14, outline: "none", color: "#1a0a2e",
  background: "#faf8f5", boxSizing: "border-box", fontFamily: "inherit",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700,
        color: "#555", marginBottom: 6, letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}
