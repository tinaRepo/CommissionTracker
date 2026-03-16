"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleEmail() {
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // セッションが反映されるまで少し待ってからリダイレクト
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = "/";
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${location.origin}/` }
        });
        if (error) throw error;
        setMessage({ type: "success", text: "確認メールを送りました。メールのリンクをクリックしてください。" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/update-password`,
        });
        if (error) throw error;
        setMessage({ type: "success", text: "パスワードリセットのメールを送りました。" });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message ?? "エラーが発生しました" });
    } finally {
      setLoading(false);
    }
  }

  /* 一時無効化
  async function handleOAuth(provider: "google" | "twitter") {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setMessage({ type: "error", text: error.message });
    setLoading(false);
  }
  */

  const titles: Record<Mode, string> = {
    login: "ログイン",
    signup: "新規登録",
    reset: "パスワードをリセット",
  };

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
        width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px #0006, 0 0 0 1px #ffffff10",
      }}>
        {/* ロゴ */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 38, marginBottom: 6, filter: "drop-shadow(0 2px 8px #7c3aed40)" }}>🎨</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#1a0a2e" }}>Commission Tracker</div>
          <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>{titles[mode]}</div>
        </div>

        {/* メッセージ */}
        {message && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13,
            background: message.type === "error" ? "#fee2e2" : "#d1fae5",
            color: message.type === "error" ? "#b91c1c" : "#065f46",
            border: `1px solid ${message.type === "error" ? "#fca5a5" : "#6ee7b7"}`,
          }}>
            {message.text}
          </div>
        )}

        {/* SNSログイン（resetモード以外） */}
        {/* 一時無効化
        mode !== "reset" && (
          <>
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              <OAuthButton
                onClick={() => handleOAuth("google")}
                disabled={loading}
                icon="G"
                label="Googleでログイン"
                color="#4285f4"
              />
              <OAuthButton
                onClick={() => handleOAuth("twitter")}
                disabled={loading}
                icon="𝕏"
                label="X (Twitter) でログイン"
                color="#000"
              />
            </div>
            <Divider />
          </>
        )*/}

        {/* メール入力 */}
        <form onSubmit={(e) => { e.preventDefault(); handleEmail(); }}
          style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <InputField
            type="email" placeholder="メールアドレス"
            value={email} onChange={setEmail}
          />
          {mode !== "reset" && (
            <InputField
              type="password" placeholder="パスワード（6文字以上）"
              value={password} onChange={setPassword}
            />
          )}
          <button type="submit" style={{ display: "none" }} />
        </form>

        {/* メインボタン */}
        <button
          onClick={handleEmail}
          disabled={loading || !email || (mode !== "reset" && !password)}
          style={{
            width: "100%", padding: "12px",
            background: (loading || !email || (mode !== "reset" && !password))
              ? "#c4b5fd"
              : "linear-gradient(135deg,#7c3aed,#4f46e5)",
            color: "#fff", border: "none", borderRadius: 12,
            fontWeight: 800, fontSize: 15, cursor: "pointer",
            transition: "opacity 0.15s",
          }}
        >
          {loading ? "処理中…" : titles[mode]}
        </button>

        {/* モード切替リンク */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#666", display: "flex", flexDirection: "column", gap: 8 }}>
          {mode === "login" && (
            <>
              <span>アカウントをお持ちでない方は
                <TextLink onClick={() => { setMode("signup"); setMessage(null); }}>新規登録</TextLink>
              </span>
              <TextLink onClick={() => { setMode("reset"); setMessage(null); }}>
                パスワードを忘れた方はこちら
              </TextLink>
            </>
          )}
          {mode === "signup" && (
            <span>すでにアカウントをお持ちの方は
              <TextLink onClick={() => { setMode("login"); setMessage(null); }}>ログイン</TextLink>
            </span>
          )}
          {mode === "reset" && (
            <TextLink onClick={() => { setMode("login"); setMessage(null); }}>
              ← ログインに戻る
            </TextLink>
          )}
          {mode === "login" && (
            <TextLink onClick={() => window.location.href = "/contact"}>
              ✉️ お問い合わせ
            </TextLink>
          )}
        </div>
      </div>
    </div>
  );
}

function OAuthButton({ onClick, disabled, icon, label, color }: {
  onClick: () => void; disabled: boolean;
  icon: string; label: string; color: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "11px", border: "1.5px solid #e5e7eb",
      borderRadius: 12, background: "#fff", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      fontWeight: 600, fontSize: 14, color: "#222",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
    >
      <span style={{ fontWeight: 900, color, fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
      {label}
    </button>
  );
}

function InputField({ type, placeholder, value, onChange }: {
  type: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  const autoComplete = type === "email" ? "email" : type === "password" ? "current-password" : "off";
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      autoComplete={autoComplete}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "11px 14px",
        border: "1.5px solid #e5e7eb", borderRadius: 12,
        fontSize: 14, outline: "none", color: "#1a0a2e",
        background: "#faf8f5", boxSizing: "border-box",
        fontFamily: "inherit",
      }}
    />
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
      <span style={{ fontSize: 12, color: "#aaa", whiteSpace: "nowrap" }}>またはメールで</span>
      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
    </div>
  );
}

function TextLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", color: "#7c3aed",
      fontWeight: 700, cursor: "pointer", fontSize: 13, padding: "0 4px",
    }}>
      {children}
    </button>
  );
}
