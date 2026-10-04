"use client";
import { useState, useEffect } from "react";

// モックデータ
const MOCK_TASKS = [
  { title: "名刺デザイン一式", assignee: "田中デザイン事務所", status: "制作中", deadline: "04/05", price: "¥5,000", urgent: true },
  { title: "紹介動画の編集", assignee: "スタジオみらい", status: "確認中", deadline: "04/12", price: "¥12,000", urgent: false },
  { title: "バナー制作", assignee: "フリーランス佐藤", status: "依頼済み", deadline: "04/20", price: "¥3,500", urgent: false },
];

// 機能紹介・料金プラン・FAQのデータ
const FEATURES = [
  { title: "タスクを一元管理", desc: "件名・依頼先名・納期・金額・メモをまとめて記録。依頼の迷子がなくなります。" },
  { title: "ステータス管理", desc: "依頼済み・確認中・制作中・完成・キャンセルの5段階で進捗を管理。" },
  { title: "納期アラート", desc: "納期7日前になると自動でハイライト。締め切りを見逃しません。" },
  { title: "画像添付", desc: "確認用・制作中・完成画像をアップロードして一括管理。種類ごとに整理できます。" },
  { title: "並び替え・フィルタ", desc: "依頼日・納期・金額・ステータスで並び替え。フィルタリングも可能。" },
  { title: "スマホ対応", desc: "PCでもスマホでも快適に使えます。ホーム画面に追加してアプリとして利用可能。" },
];

// 料金プラン
const PLANS = [
  { label: "無料", price: "¥0", period: "", features: ["タスクの登録・管理", "画像 合計10枚まで", "全ステータス対応", "納期アラート"], cta: "無料で始める", featured: false },
  { label: "スタンダード", price: "¥300", period: "/月", features: ["タスクの登録・管理", "画像 合計50枚まで", "全ステータス対応", "納期アラート"], cta: "始める", featured: false },
  { label: "プレミアム", price: "¥800", period: "/月", features: ["タスクの登録・管理", "画像 無制限", "全ステータス対応", "納期アラート", "優先サポート"], cta: "始める", featured: true },
];

// FAQ
const FAQS = [
  { q: "無料プランでいつまでも使えますか？", a: "はい、無料プランは期限なく使えます。画像の合計枚数が10枚を超えた場合は有料プランへのアップグレードが必要です。" },
  { q: "支払い方法は何が使えますか？", a: "クレジットカード・デビットカードが使えます。決済はStripeで安全に処理され、カード情報は当サービスには保存されません。" },
  { q: "解約はいつでもできますか？", a: "いつでも解約できます。解約後は次の更新日まで引き続きご利用いただけます。" },
  { q: "スマホでも使えますか？", a: "はい、スマホ・タブレット・PCすべてに対応しています。SafariやChromeからホーム画面に追加するとアプリのように使えます。" },
  { q: "データは安全ですか？", a: "データはSupabaseに安全に保存され、SSL通信・行レベルセキュリティにより他のユーザーからのアクセスは完全に遮断されています。" },
];

// ランディングページ
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "var(--surface-inverse)", color: "var(--fg-on-inverse)" }}>

      {/* ナビ */}
      <nav className="nav-public" style={{
        background: scrolled ? "rgba(11,11,15,0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-on-inverse)" : "1px solid transparent",
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>ツクリスト</span>
        <div className="row" style={{ gap: 16 }}>
          <a href="/login" style={{ color: "var(--muted-on-inverse)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>ログイン</a>
          <a href="/login" className="btn btn-inverse btn-sm">無料で始める</a>
        </div>
      </nav>

      {/* ヒーロー */}
      <section className="hero">
        <div className="hero-eyebrow">納期・タスク管理ツール</div>
        <h1 className="hero-title">納期を、<br />もう迷子にしない。</h1>
        <p className="hero-subtitle">
          依頼状況・納期・金額・画像をまとめて管理。<br />
          外注・依頼をスッキリ整理できる無料Webアプリ。
        </p>

        <div className="row" style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/login" className="btn btn-inverse">無料で始める →</a>
          <a href="/login?demo=1" className="btn btn-inverse-outline">デモを試す</a>
        </div>
        <p style={{ fontSize: 12, color: "var(--meta)", marginTop: 20 }}>クレジットカード不要・登録1分</p>

        {/* モックUI */}
        <div style={{
          marginTop: 72, width: "100%", maxWidth: 640,
          background: "var(--surface-inverse-2)", border: "1px solid var(--border-on-inverse)",
          borderRadius: "var(--radius-xl)", padding: 20, textAlign: "left",
        }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 16, padding: "10px 14px", borderBottom: "1px solid var(--border-on-inverse)" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>ツクリスト</span>
            <div className="row" style={{ gap: 16, fontSize: 11, color: "var(--muted-on-inverse)" }}>
              <span>合計 <strong style={{ color: "#fff" }}>5</strong></span>
              <span>進行中 <strong style={{ color: "#fff" }}>3</strong></span>
              <span>完成 <strong style={{ color: "#fff" }}>2</strong></span>
            </div>
          </div>
          {MOCK_TASKS.map((t, i) => (
            <div key={i} className="row" style={{
              justifyContent: "space-between", padding: "12px 14px", marginBottom: 6,
              borderRadius: "var(--radius-md)",
              background: t.urgent ? "rgba(197,48,48,0.12)" : "rgba(255,255,255,0.03)",
            }}>
              <div>
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</span>
                  <span className="badge badge-neutral" style={{ background: "rgba(255,255,255,0.12)", color: "var(--fg-on-inverse)" }}>{t.status}</span>
                  {t.urgent && <span style={{ fontSize: 10, color: "#e88", fontWeight: 700 }}>あと3日</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-on-inverse)" }}>{t.assignee} ・ 納期 {t.deadline}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 機能紹介（白背景セクションへ切り替え） */}
      <section className="section" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <div className="container-narrow" style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="section-title">依頼管理に必要な機能が全部揃ってる</h2>
          <p className="section-subtitle">シンプルで使いやすい、納期管理専用ツール</p>
        </div>
        <div className="container">
          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-cell">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* プラン・料金 */}
      <section className="section" style={{ background: "var(--surface)", color: "var(--fg)" }}>
        <div className="container-narrow" style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="section-title">シンプルな料金プラン</h2>
          <p className="section-subtitle">まずは無料で試してみてください</p>
        </div>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {PLANS.map((p, i) => (
            <div key={i} className={`pricing-card${p.featured ? " featured" : ""}`}>
              {p.featured && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "var(--accent)", color: "#fff", borderRadius: 999, padding: "3px 14px",
                  fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  おすすめ
                </div>
              )}
              <div className="text-meta" style={{ marginBottom: 10, fontWeight: 700 }}>{p.label}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 700 }}>{p.price}</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{p.period}</span>
              </div>
              <ul style={{ listStyle: "none", display: "grid", gap: 10, marginBottom: 26 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--fg-2)" }}>
                    <span style={{ color: "var(--accent)" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <a href="/login" className={cxBtn(p.featured)}>{p.cta}</a>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--meta)", marginTop: 24 }}>いつでもキャンセル可能・月額制</p>
      </section>

      {/* FAQ */}
      <section className="section" style={{ background: "var(--bg)", color: "var(--fg)" }}>
        <div className="container-narrow">
          <h2 className="section-title" style={{ textAlign: "center", marginBottom: 40 }}>よくある質問</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {FAQS.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ textAlign: "center" }}>
        <h2 className="section-title" style={{ color: "var(--fg-on-inverse)" }}>今すぐ無料で始めよう</h2>
        <p style={{ color: "var(--muted-on-inverse)", fontSize: 14, marginBottom: 32 }}>登録1分・クレジットカード不要</p>
        <div className="row" style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/login" className="btn btn-inverse">無料アカウントを作成 →</a>
          <a href="/login?demo=1" className="btn btn-inverse-outline">デモを試す</a>
        </div>
      </section>

      {/* フッター */}
      <footer style={{ borderTop: "1px solid var(--border-on-inverse)", padding: "32px 24px" }}>
        <div className="container" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>ツクリスト</span>
          <div className="row" style={{ flexWrap: "wrap", gap: "4px 16px" }}>
            {[
              { href: "/lp", label: "サービス紹介" },
              { href: "/guide", label: "使い方" },
              { href: "/terms", label: "利用規約" },
              { href: "/privacy", label: "プライバシー" },
              { href: "/tokusho", label: "特定商取引法" },
            ].map(link => (
              <a key={link.href} href={link.href} style={{ fontSize: 12, color: "var(--meta)", textDecoration: "none" }}>
                {link.label}
              </a>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "var(--meta)" }}>© 2026 ツクリスト</span>
        </div>
      </footer>
    </div>
  );
}

// ボタンのクラス名を決定する関数
function cxBtn(featured: boolean) {
  return featured ? "btn btn-primary btn-block" : "btn btn-secondary btn-block";
}

// FAQアイテムコンポーネント
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button onClick={() => setOpen(v => !v)} className="faq-question">
        <span>{q}</span>
        <span style={{ color: "var(--accent)", fontSize: 18, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  );
}
