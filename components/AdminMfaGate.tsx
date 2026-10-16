"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Enrollment = { factorId: string; qrCode: string; secret: string };
type GateMode = "loading" | "setup" | "challenge" | "verified" | "error";

export default function AdminMfaGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const initialized = useRef(false);
  const [mode, setMode] = useState<GateMode>("loading");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const initialize = useCallback(async () => {
    setMode("loading");
    setError(null);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setError("ログイン状態を確認できませんでした。再読み込みしてください。");
      setMode("error");
      return;
    }
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      setError("管理者権限を確認できませんでした。");
      setMode("error");
      return;
    }
    if (!profile?.is_admin) {
      router.replace("/forbidden");
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      setError("ログイン状態を確認できませんでした。再読み込みしてください。");
      setMode("error");
      return;
    }
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel(session.access_token);
    if (assuranceError) {
      setError("二段階認証の状態を確認できませんでした。");
      setMode("error");
      return;
    }
    if (assurance.currentLevel === "aal2") {
      setMode("verified");
      return;
    }

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setError("二段階認証の設定を読み込めませんでした。");
      setMode("error");
      return;
    }
    const verifiedTotp = factors.totp[0];
    if (verifiedTotp) {
      setFactorId(verifiedTotp.id);
      setMode("challenge");
      return;
    }

    const pendingTotp = factors.all.filter(
      factor => factor.factor_type === "totp" && factor.status === "unverified"
    );
    for (const factor of pendingTotp) {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (unenrollError) {
        setError("未完了の二段階認証設定をやり直せませんでした。");
        setMode("error");
        return;
      }
    }

    const { data: newFactor, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Tsukurist Admin",
      issuer: "ツクリスト管理",
    });
    if (enrollError) {
      setError("二段階認証を開始できませんでした。時間をおいて再度お試しください。");
      setMode("error");
      return;
    }
    setEnrollment({
      factorId: newFactor.id,
      qrCode: newFactor.totp.qr_code,
      secret: newFactor.totp.secret,
    });
    setMode("setup");
  }, [router]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void initialize();
  }, [initialize]);

  async function verifyCode() {
    const targetFactorId = mode === "setup" ? enrollment?.factorId : factorId;
    if (!targetFactorId || !/^\d{6}$/.test(code)) {
      setError("認証アプリに表示された6桁のコードを入力してください。");
      return;
    }

    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: targetFactorId,
      code,
    });
    if (verifyError) {
      setError("認証コードが正しくありません。最新の6桁コードを入力してください。");
      setBusy(false);
      return;
    }

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance.currentLevel !== "aal2") {
      setError("二段階認証を完了できませんでした。もう一度お試しください。");
      setBusy(false);
      return;
    }
    setEnrollment(null);
    setCode("");
    setMode("verified");
    setBusy(false);
  }

  if (mode === "verified") return <>{children}</>;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "var(--surface)" }}>
      <section className="card" style={{ width: "100%", maxWidth: 440, padding: 24 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>管理者の二段階認証</h1>
        {mode === "loading" ? (
          <p className="text-muted">認証状態を確認しています…</p>
        ) : mode === "setup" && enrollment ? (
          <>
            <p className="text-muted" style={{ lineHeight: 1.7 }}>
              認証アプリでQRコードを読み取り、表示された6桁のコードを入力してください。
            </p>
            <div style={{ display: "grid", placeItems: "center", margin: "16px 0" }}>
              <Image
                src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qrCode)}`}
                alt="二段階認証の設定用QRコード"
                width={200}
                height={200}
                unoptimized
              />
            </div>
            <p className="text-meta" style={{ lineHeight: 1.6, overflowWrap: "anywhere" }}>
              QRコードを読み取れない場合は、このセットアップキーを認証アプリに登録してください。
            </p>
            <code style={{ display: "block", padding: 10, margin: "8px 0 16px", background: "var(--surface-2)", overflowWrap: "anywhere" }}>
              {enrollment.secret}
            </code>
          </>
        ) : mode === "challenge" ? (
          <p className="text-muted" style={{ lineHeight: 1.7 }}>
            認証アプリに表示されている6桁のコードを入力してください。
          </p>
        ) : (
          <p className="text-muted" style={{ lineHeight: 1.7 }}>
            {error ?? "認証状態を確認できませんでした。"}
          </p>
        )}

        {(mode === "setup" || mode === "challenge") && (
          <form onSubmit={event => { event.preventDefault(); void verifyCode(); }}>
            <label htmlFor="admin-totp-code" className="field-label">認証コード</label>
            <input
              id="admin-totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input"
              style={{ marginTop: 6, letterSpacing: "0.3em", textAlign: "center" }}
              disabled={busy}
            />
            {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6} style={{ width: "100%", marginTop: 14 }}>
              {busy ? "確認中…" : "二段階認証を有効にして続行"}
            </button>
          </form>
        )}

        {mode === "error" && (
          <button type="button" onClick={() => void initialize()} className="btn btn-secondary" style={{ width: "100%", marginTop: 12 }}>
            再試行
          </button>
        )}
      </section>
    </main>
  );
}
