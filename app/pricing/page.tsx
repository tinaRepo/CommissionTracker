"use client";

import { Icon } from "@/components/TaskShared";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// プラン情報
const PLANS = [
  {
    key: "free",
    label: "無料",
    price: 0,
    features: ["タスクの登録・管理", "画像アップロード 合計10枚まで", "ステータス管理", "納期アラート"],
    priceId: null,
  },
  {
    key: "standard",
    label: "スタンダード",
    price: 300,
    features: ["タスクの登録・管理", "カレンダー表示", "画像アップロード 合計50枚まで", "ステータス管理", "納期アラート"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID,
  },
  {
    key: "premium",
    label: "プレミアム",
    price: 800,
    features: ["タスクの登録・管理", "カレンダー表示", "共有用公開ページ", "画像アップロード 無制限", "ステータス管理", "納期アラート", "優先サポート"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
  },
];

// ページメタデータ
export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);

  // ユーザーのセッションを取得し、現在のプランとサブスクリプション状況を設定する
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCheckoutStatus(params.get("checkout"));

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      const { data } = await supabase
        .from("user_profiles")
        .select("plan, stripe_customer_id, subscription_status")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setCurrentPlan(data.plan ?? "free");
        setHasSubscription(!!data.stripe_customer_id && ["active", "past_due"].includes(data.subscription_status ?? ""));
      }
    });
  }, []);

  // 有料プランを申し込む処理
  async function handleSubscribe(priceId: string) {
    setLoading(priceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error === "already_subscribed" ? "有効なサブスクリプションがあります。プラン・支払い管理をご利用ください。" : "エラーが発生しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(null);
    }
  }

  // Stripeのカスタマーポータルに遷移する処理
  async function handlePortal() {
    setLoading("portal");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "エラーが発生しました");
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancelSubscription() {
    if (!window.confirm("有料プランを今すぐ解約します。未使用期間分は日割り計算し、支払い済み金額を上限として元のカードへ返金します。解約しますか？")) return;

    setLoading("cancel");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "解約・返金の処理を完了できませんでした。");
        return;
      }

      setCurrentPlan("free");
      setHasSubscription(false);
      alert(data.refunded
        ? "解約しました。未使用期間分の日割り返金を元のカードへ依頼しました。返金の反映時期はカード会社により異なります。"
        : "解約しました。今回、返金対象となる未使用期間分はありませんでした。");
    } catch {
      alert("解約・返金の処理を完了できませんでした。時間をおいて再度お試しください。");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>
      <header className="doc-header">
        <button onClick={() => window.location.href = "/"} className="doc-back-btn"><Icon name="arrowLeft" size={14} /> 戻る</button>
        <span className="title">プランを選択</span>
      </header>

      <main className="container-narrow" style={{ padding: "40px 20px 80px" }}>

        {checkoutStatus === "success" && (
          <div style={{ marginBottom: 24, padding: "14px 18px", background: "var(--success-soft)", borderRadius: "var(--radius-md)", fontSize: 14, color: "var(--success)", fontWeight: 600 }}>
            プランの申し込みが完了しました！
          </div>
        )}
        {checkoutStatus === "cancelled" && (
          <div style={{ marginBottom: 24, padding: "14px 18px", background: "var(--danger-soft)", borderRadius: "var(--radius-md)", fontSize: 14, color: "var(--danger)" }}>
            決済がキャンセルされました。
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="text-muted" style={{ fontSize: 14, marginBottom: 8 }}>現在のプラン：
            <strong style={{ color: "var(--fg)" }}> {PLANS.find(p => p.key === currentPlan)?.label ?? "無料"}</strong>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>プランを選択してください</h1>
          <p className="text-muted" style={{ fontSize: 14 }}>月額制・プラン変更や解約はいつでも可能</p>
        </div>

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          marginBottom: 28, padding: "22px 20px", background: "var(--bg)",
          border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>プラン選択の前にデモでお試しいただけます</div>
            <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              デモ画面では、カレンダー表示のイメージや共有ページのサンプルをご覧いただけます。
            </div>
          </div>
          <a href="/demo" className="btn btn-secondary" style={{ textDecoration: "none" }}>
            デモ画面を見る
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginBottom: 32 }}>
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.key;
            const isLoading = loading === plan.priceId;
            return (
              <div key={plan.key} className="pricing-card" style={{
                borderColor: isCurrent ? "var(--accent)" : undefined,
                boxShadow: isCurrent ? "0 0 0 1px var(--accent)" : undefined,
              }}>
                {isCurrent && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "#fff", borderRadius: 999, padding: "3px 14px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                    現在のプラン
                  </div>
                )}
                {plan.key === "premium" && !isCurrent && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--fg)", color: "var(--bg)", borderRadius: 999, padding: "3px 14px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                    おすすめ
                  </div>
                )}

                <div className="text-meta" style={{ marginBottom: 10, fontWeight: 600 }}>{plan.label}</div>

                <div style={{ marginBottom: 20 }}>
                  {plan.price === 0 ? (
                    <span style={{ fontSize: 30, fontWeight: 600 }}>無料</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 30, fontWeight: 600 }}>¥{plan.price.toLocaleString()}</span>
                      <span className="text-muted" style={{ fontSize: 13, marginLeft: 4 }}>/月</span>
                    </>
                  )}
                </div>

                <ul style={{ listStyle: "none", margin: "0 0 24px", display: "grid", gap: 8 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--fg-2)" }}>
                      <span style={{ color: "var(--accent)", display: "inline-flex" }}><Icon name="check" size={16} /></span>{f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="btn btn-secondary btn-block" style={{ cursor: "default" }}>利用中</div>
                ) : hasSubscription ? (
                  <div className="btn btn-secondary btn-block" style={{ cursor: "default", color: "var(--meta)" }}>
                    プラン・支払い管理をご利用ください
                  </div>
                ) : (
                  <button onClick={() => plan.priceId && handleSubscribe(plan.priceId)} disabled={!!loading} className="btn btn-primary btn-block">
                    {isLoading ? "処理中…" : "このプランを選択"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {hasSubscription && (
          <div style={{ textAlign: "center" }}>
            <button onClick={handlePortal} disabled={loading === "portal"} className="btn btn-secondary">
              {loading === "portal" ? "処理中…" : "プラン・支払い管理"}
            </button>
            <div className="text-meta" style={{ marginTop: 8 }}>Stripeでプラン変更や支払い方法を管理できます</div>
            <p className="text-meta" style={{ margin: "8px auto 0", maxWidth: 520, lineHeight: 1.7 }}>
              プラン変更は残り期間に応じて日割り計算されます。プランの解約はこの画面から行えます。
            </p>
            <button onClick={handleCancelSubscription} disabled={!!loading} className="btn btn-danger" style={{ marginTop: 16 }}>
              {loading === "cancel" ? "解約処理中…" : "有料プランを解約する"}
            </button>
            <p className="text-meta" style={{ margin: "8px auto 0", maxWidth: 520, lineHeight: 1.7 }}>
              解約は即時に反映されます。未使用期間分は日割り計算し、支払い済み金額を上限として元のカードへ返金します。
            </p>
          </div>
        )}

        <div style={{ maxWidth: 640, margin: "40px auto 0", padding: "16px 20px", background: "var(--bg)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--muted)", lineHeight: 1.8, textAlign: "center" }}>
          決済はStripeで安全に処理されます。カード情報は当サービスのサーバーには保存されません。
        </div>
      </main>
    </div>
  );
}
