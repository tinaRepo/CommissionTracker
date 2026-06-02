"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
const DemoApp = dynamic(() => import("@/components/DemoApp"), { ssr: false });

function toJapanese(msg: string): string {
  if (!msg) return "エラーが発生しました";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません";
  if (m.includes("email not confirmed")) return "メールアドレスの確認が完了していません。確認メールをご確認ください";
  if (m.includes("user already registered")) return "メールアドレスまたはパスワードが正しくありません";
  if (m.includes("password should be at least")) return "パスワードは6文字以上で入力してください";
  if (m.includes("unable to validate email")) return "メールアドレスの形式が正しくありません";
  if (m.includes("email address is invalid")) return "メールアドレスの形式が正しくありません";
  if (m.includes("signup is disabled")) return "現在新規登録は受け付けていません";
  if (m.includes("email rate limit exceeded")) return "しばらく時間をおいてから再度お試しください";
  if (m.includes("over email send rate limit")) return "メール送信の上限に達しました。しばらくお待ちください";
  if (m.includes("token has expired")) return "リンクの有効期限が切れています。もう一度お試しください";
  if (m.includes("user not found")) return "メールアドレスまたはパスワードが正しくありません";
  if (m.includes("network")) return "ネットワークエラーが発生しました。接続を確認してください";
  return "エラーが発生しました（" + msg + "）";
}

type Mode = "login" | "signup" | "reset";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/";
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") setDemoMode(true);
  }, []);

  if (demoMode) {
    return <DemoApp onExit={() => setDemoMode(false)} />;
  }

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
      setMessage({ type: "error", text: toJapanese(e.message ?? "") });
    } finally {
      setLoading(false);
    }
  }

  // Googleのログイン機能の追加
  async function handleOAuth(provider: "google" | "twitter") {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setMessage({
          type: "error",
          text: toJapanese(error.message),
        });
        return;
      }

    } catch (e: any) {
      console.error("oauth exception", e);

      setMessage({
        type: "error",
        text:
          e?.message ??
          "Googleログイン中に予期しないエラーが発生しました",
      });
    } finally {
      setLoading(false);
    }
  }

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

        {mode !== "reset" && (
          <>
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              <OAuthButton
                onClick={() => handleOAuth("google")}
                disabled={loading}
                icon="G"
                label="Googleで続ける"
                color="#4285f4"
              />
              {/* 一時無効化
              <OAuthButton
                onClick={() => handleOAuth("twitter")}
                disabled={loading}
                icon="𝕏"
                label="X (Twitter) でログイン"
                color="#000"
              />
              */}
            </div>
            <Divider />
          </>
        )}

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

        {/* デモボタン */}
        {mode === "login" && (
          <button
            onClick={() => setDemoMode(true)}
            style={{
              width: "100%", padding: "12px", marginTop: 10,
              background: "#fff", color: "#7c3aed",
              border: "1.5px solid #c4b5fd", borderRadius: 12,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            🎮 ログインせずにデモを試す
          </button>
        )}

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
        {/* フッターリンク */}
        <div style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "4px 12px",
        }}>
          {[
            { href: "/lp", label: "サービス紹介" },
            { href: "/guide", label: "使い方" },
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシー" },
            { href: "/tokusho", label: "特定商取引法" },
            { href: "/version", label: "バージョン情報" },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontSize: 11,
                color: "#aaa",
                textDecoration: "none",
                padding: "2px 4px",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#7c3aed")}
              onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
            >
              {link.label}
            </a>
          ))}
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
        width: "100%", padding: "10px 12px",
        border: "1.5px solid #e5e7eb", borderRadius: 12,
        fontSize: 16, outline: "none", color: "#1a0a2e",
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
