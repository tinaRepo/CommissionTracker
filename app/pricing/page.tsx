"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

const PLANS = [
  {
    key: "free",
    label: "無料",
    price: 0,
    color: "#6b7280",
    bg: "#f3f4f6",
    features: ["依頼の登録・管理", "画像アップロード 合計10枚まで", "ステータス管理", "納期アラート"],
    priceId: null,
  },
  {
    key: "standard",
    label: "スタンダード",
    price: 300,
    color: "#3b82f6",
    bg: "#dbeafe",
    features: ["依頼の登録・管理", "画像アップロード 合計50枚まで", "ステータス管理", "納期アラート"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID,
  },
  {
    key: "premium",
    label: "プレミアム",
    price: 800,
    color: "#7c3aed",
    bg: "#ede9fe",
    features: ["依頼の登録・管理", "画像アップロード 無制限", "ステータス管理", "納期アラート", "優先サポート"],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
  },
];

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      const { data } = await supabase
        .from("user_profiles")
        .select("plan, stripe_customer_id, subscription_status")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setCurrentPlan(data.plan ?? "free");
        setHasSubscription(!!data.stripe_customer_id && data.subscription_status === "active");
      }
    });
  }, []);

  async function handleUpgrade(priceId: string) {
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
        alert(data.error === "already_subscribed" ? "すでにサブスクリプションがあります。プラン管理から変更してください。" : "エラーが発生しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(null);
    }
  }

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
      else alert("エラーが発生しました");
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
      <header style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 32px #0004" }}>
        <button onClick={() => window.location.href = "/"} style={{ background: "#ffffff18", border: "1px solid #ffffff30", color: "#c4b5fd", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>← 戻る</button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>プランを選択</span>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* 決済完了・キャンセルメッセージ */}
        {checkoutStatus === "success" && (
          <div style={{ marginBottom: 24, padding: "14px 18px", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 12, fontSize: 14, color: "#065f46", fontWeight: 600 }}>
            🎉 プランのアップグレードが完了しました！
          </div>
        )}
        {checkoutStatus === "cancelled" && (
          <div style={{ marginBottom: 24, padding: "14px 18px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, fontSize: 14, color: "#b91c1c" }}>
            決済がキャンセルされました。
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>現在のプラン：
            <span style={{ fontWeight: 800, color: "#1a0a2e" }}>
              {PLANS.find(p => p.key === currentPlan)?.label ?? "無料"}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a0a2e", marginBottom: 8 }}>プランを選択してください</h1>
          <p style={{ fontSize: 14, color: "#888" }}>いつでもキャンセル可能・月額制</p>
        </div>

        {/* プランカード */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginBottom: 32 }}>
          {PLANS.map(plan => {
            const isCurrent = currentPlan === plan.key;
            const isLoading = loading === plan.priceId;
            return (
              <div key={plan.key} style={{
                background: "#fff", borderRadius: 20, padding: "28px 24px",
                border: isCurrent ? `2.5px solid ${plan.color}` : "1.5px solid #e5e7eb",
                boxShadow: isCurrent ? `0 0 0 4px ${plan.color}20` : "0 2px 12px #0001",
                position: "relative",
              }}>
                {isCurrent && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "#fff", borderRadius: 999, padding: "3px 14px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    現在のプラン
                  </div>
                )}
                {plan.key === "premium" && !isCurrent && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", borderRadius: 999, padding: "3px 14px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    おすすめ
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <span style={{ background: plan.bg, color: plan.color, borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 800 }}>{plan.label}</span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  {plan.price === 0 ? (
                    <span style={{ fontSize: 32, fontWeight: 800, color: "#1a0a2e" }}>無料</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 32, fontWeight: 800, color: "#1a0a2e" }}>¥{plan.price.toLocaleString()}</span>
                      <span style={{ fontSize: 13, color: "#888", marginLeft: 4 }}>/月</span>
                    </>
                  )}
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 8 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#444" }}>
                      <span style={{ color: plan.color, fontWeight: 700 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div style={{ width: "100%", padding: "11px", background: plan.bg, color: plan.color, border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, textAlign: "center" }}>
                    利用中
                  </div>
                ) : plan.key === "free" ? (
                  <div style={{ width: "100%", padding: "11px", background: "#f3f4f6", color: "#aaa", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, textAlign: "center" }}>
                    ダウングレードは解約後
                  </div>
                ) : (
                  <button
                    onClick={() => plan.priceId && handleUpgrade(plan.priceId)}
                    disabled={!!loading}
                    style={{ width: "100%", padding: "11px", background: loading ? "#c4b5fd" : `linear-gradient(135deg,${plan.color},${plan.color}cc)`, color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
                    {isLoading ? "処理中…" : `${plan.label}にアップグレード`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* サブスク管理ボタン */}
        {hasSubscription && (
          <div style={{ textAlign: "center" }}>
            <button onClick={handlePortal} disabled={loading === "portal"}
              style={{ background: "#fff", color: "#7c3aed", border: "1.5px solid #c4b5fd", borderRadius: 12, padding: "11px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {loading === "portal" ? "処理中…" : "🔧 プラン・支払い管理（解約はこちら）"}
            </button>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>Stripeのカスタマーポータルに移動します</div>
          </div>
        )}

        <div style={{ marginTop: 40, padding: "16px 20px", background: "#f8f7ff", borderRadius: 12, fontSize: 13, color: "#666", lineHeight: 1.7, textAlign: "center" }}>
          決済はStripeで安全に処理されます。カード情報は当サービスのサーバーには保存されません。<br />
          ご不明な点は<a href="/contact" style={{ color: "#7c3aed", fontWeight: 600 }}>お問い合わせ</a>ください。
        </div>
      </main>
    </div>
  );
}
