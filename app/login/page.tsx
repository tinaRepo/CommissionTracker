"use client";

import { useState, useEffect } from "react";
import { supabase, isValidEmailFormat, DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, toJapaneseAuthError } from "@/lib/supabase";
import dynamic from "next/dynamic";
import ContactModal from "@/components/ContactModal";
const DemoApp = dynamic(() => import("@/components/DemoApp"), { ssr: false });

type Mode = "login" | "signup" | "reset";

// ログインページ
export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [lastProvider, setLastProvider] = useState<string | null>(null);

  const isEmailValid = isValidEmailFormat(email);
  const isPasswordValid = mode === "reset" || password.length >= PASSWORD_MIN_LENGTH;
  const isDisplayNameValid = mode !== "signup" || (displayName.trim().length > 0 && displayName.trim().length <= DISPLAY_NAME_MAX_LENGTH);

  const isSubmitDisabled =
    loading ||
    !email ||
    !isEmailValid ||
    (mode !== "reset" && !isPasswordValid) ||
    !isDisplayNameValid;

  // ログイン済みの場合はトップページにリダイレクト
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") setDemoMode(true);

    if (params.get("error") === "reset_link_invalid") {
      setMessage({
        type: "error",
        text: "パスワード設定・リセット用リンクを確認できませんでした。ログイン画面からメールを再送信してください。",
      });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/";
    });
  }, []);

  // ログイン画面にアクセスした際に、前回のログインプロバイダを取得して表示する
  useEffect(() => {
    fetch("/api/auth/last-login-provider")
      .then(res => res.json())
      .then(data => setLastProvider(data.provider ?? null))
      .catch(() => { });
  }, []);

  // デモモードの場合はDemoAppを表示
  if (demoMode) {
    return <DemoApp onExit={() => setDemoMode(false)} />;
  }

  // メールログイン・サインアップ・パスワードリセットの処理
  async function handleEmail() {
    setLoading(true);
    setMessage(null);
    try {
      if (!isValidEmailFormat(email)) {
        setMessage({ type: "error", text: "メールアドレスの形式が正しくありません" });
        setLoading(false);
        return;
      }
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          try {
            const response = await fetch("/api/auth/last-login-provider", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ provider: "email" }),
            });
            if (!response.ok) {
              console.error("failed to save email login provider:", response.status, await response.text());
            }
          } catch (error) {
            console.error("failed to save email login provider:", error);
          }
        }
        window.location.href = "/";
      } else if (mode === "signup") {
        const trimmedName = displayName.trim();
        if (!trimmedName) {
          setMessage({ type: "error", text: "表示名を入力してください" });
          setLoading(false);
          return;
        }
        if (trimmedName.length > DISPLAY_NAME_MAX_LENGTH) {
          setMessage({ type: "error", text: `表示名は${DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください` });
          setLoading(false);
          return;
        }
        if (password.length < PASSWORD_MIN_LENGTH) {
          setMessage({ type: "error", text: `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください` });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${location.origin}/`,
            data: { display_name: trimmedName },
          }
        });
        if (error) throw error;
        setMessage({ type: "success", text: "確認メールを送りました。メールのリンクをクリックしてください。" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/confirm`,
        });
        if (error) throw error;
        setMessage({ type: "success", text: "パスワードリセットのメールを送りました。" });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: toJapaneseAuthError(e.message ?? "") });
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "twitter") {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        setMessage({ type: "error", text: toJapaneseAuthError(error.message) });
        return;
      }
    } catch (e: any) {
      console.error("oauth exception", e);
      setMessage({ type: "error", text: e?.message ?? "Googleログイン中に予期しないエラーが発生しました" });
    } finally {
      setLoading(false);
    }
  }

  // UIのレンダリング
  const titles: Record<Mode, string> = {
    login: "ログイン",
    signup: "新規登録",
    reset: "パスワードをリセット",
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--surface-inverse)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "var(--bg)", borderRadius: "var(--radius-xl)", padding: "44px 36px",
        width: "100%", maxWidth: 400, boxShadow: "var(--shadow-lg)",
      }}>
        {/* ロゴ */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 21, letterSpacing: "-0.01em" }}>ツクリスト</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{titles[mode]}</div>
        </div>

        {/* メッセージ */}
        {message && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13,
            background: message.type === "error" ? "var(--danger-soft)" : "var(--success-soft)",
            color: message.type === "error" ? "var(--danger)" : "var(--success)",
          }}>
            {message.text}
          </div>
        )}

        {mode !== "reset" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ position: "relative" }}>
                <OAuthButton onClick={() => handleOAuth("google")} disabled={loading} label="Googleで続ける" />
                {lastProvider === "google" && mode === "login" && (
                  <span style={{
                    position: "absolute", top: -8, right: -8,
                    background: "var(--success)", color: "#fff", fontSize: 9, fontWeight: 700,
                    borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap", pointerEvents: "none",
                  }}>
                    前回ログイン
                  </span>
                )}
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* メール入力 */}
        <form onSubmit={(e) => { e.preventDefault(); handleEmail(); }}
          style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          {mode === "signup" && (
            <input
              type="text" placeholder={`表示名（例: 山田太郎・${DISPLAY_NAME_MAX_LENGTH}文字まで）`}
              value={displayName} onChange={e => setDisplayName(e.target.value)}
              maxLength={DISPLAY_NAME_MAX_LENGTH} className="input"
            />
          )}
          <input
            type="email" placeholder="メールアドレス" autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)} className="input"
          />
          {mode !== "reset" && (
            <input
              type="password" placeholder={`パスワード（${PASSWORD_MIN_LENGTH}文字以上）`}
              autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              minLength={PASSWORD_MIN_LENGTH} className="input"
            />
          )}
          <button type="submit" style={{ display: "none" }} />
        </form>

        <button onClick={handleEmail} disabled={isSubmitDisabled} className="btn btn-primary btn-block">
          {loading ? "処理中…" : titles[mode]}
        </button>

        {mode === "login" && (
          <button onClick={() => setDemoMode(true)} className="btn btn-secondary btn-block" style={{ marginTop: 10 }}>
            ログインせずにデモを試す
          </button>
        )}

        <div style={{ marginTop: 22, textAlign: "center", fontSize: 13, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 8 }}>
          {mode === "login" && (
            <>
              <span>アカウントをお持ちでない方は
                <TextLink onClick={() => { setMode("signup"); setMessage(null); setDisplayName(""); }}>新規登録</TextLink>
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
            <TextLink onClick={() => setShowContact(true)}>
              お問い合わせ
            </TextLink>
          )}
        </div>

        <div className="footer-links" style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border-soft)" }}>
          {[
            { href: "/lp", label: "サービス紹介" },
            { href: "/guide", label: "使い方" },
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシー" },
            { href: "/tokusho", label: "特定商取引法" },
          ].map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
        </div>
      </div>

      <ContactModal open={showContact} onClose={() => setShowContact(false)} />
    </div>
  );
}

// OAuthボタンコンポーネント
function OAuthButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn btn-secondary btn-block">
      <span style={{ fontWeight: 900, fontSize: 15 }}>G</span>
      {label}
    </button>
  );
}

// メールログインとOAuthログインの間の区切り線
function Divider() {
  return (
    <div className="row" style={{ gap: 10, marginBottom: 20 }}>
      <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
      <span className="text-meta">またはメールで</span>
      <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
    </div>
  );
}

// テキストリンクボタンコンポーネント
function TextLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", color: "var(--accent)",
      fontWeight: 600, fontSize: 13, padding: "0 4px",
    }}>
      {children}
    </button>
  );
}
