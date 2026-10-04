"use client";

import { useState, useEffect } from "react";
import { supabase, PASSWORD_MIN_LENGTH, toJapaneseAuthError } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// パスワード再設定ページ
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);

  // パスワード再設定リンクの有効性を確認する
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "reset_link_invalid") {
      setLinkFailed(true);
      const reason = params.get("reason");
      if (reason === "code_exchange_failed") {
        setMessage("メールリンクの検証に失敗しました。リンクを発行したブラウザーで開くか、ログイン画面から新しいメールを送信してください。");
      } else if (reason === "missing_params") {
        setMessage("メールリンクに検証情報が含まれていません。メール設定を確認するか、新しいメールを送信してください。");
      } else {
        setMessage("パスワード設定・リセット用リンクを確認できませんでした。リンクの有効期限が切れたか、すでに使用済みの可能性があります。");
      }
      return;
    }

    // Supabaseのセッションを確認し、リンクが有効かどうかを判断する
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setLinkFailed(true);
        setMessage("パスワード再設定リンクの有効期限が切れています。もう一度メールを送信してください。");
      } else {
        setSessionValid(true);
      }
    }

    checkSession();
  }, []);

  // パスワードを更新する処理
  async function handleUpdate() {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(toJapaneseAuthError(error.message));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_profiles").update({ has_password: true }).eq("id", user.id);
      }
      router.push("/");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-inverse)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--bg)", borderRadius: "var(--radius-xl)", padding: "44px 36px", width: "100%", maxWidth: 400, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 19 }}>新しいパスワードを設定</div>
        </div>
        {message && (
          <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, background: "var(--danger-soft)", color: "var(--danger)" }}>
            {message}
          </div>
        )}
        {sessionValid && !linkFailed ? (
          <>
            <input
              type="password" placeholder={`新しいパスワード（${PASSWORD_MIN_LENGTH}文字以上）`}
              value={password} onChange={e => setPassword(e.target.value)}
              minLength={PASSWORD_MIN_LENGTH} className="input" style={{ marginBottom: 14 }}
            />
            <button onClick={handleUpdate} disabled={loading || password.length < PASSWORD_MIN_LENGTH} className="btn btn-primary btn-block">
              {loading ? "更新中…" : "パスワードを更新"}
            </button>
          </>
        ) : (
          <a href="/login" style={{ display: "block", textAlign: "center", color: "var(--accent)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            ログイン画面からメールを再送信する
          </a>
        )}
      </div>
    </div>
  );
}
