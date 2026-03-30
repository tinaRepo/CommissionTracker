"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/app";
    });
  }, []);
  
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const fadeIn = (id: string, delay = 0): React.CSSProperties => ({
    opacity: visible[id] ? 1 : 0,
    transform: visible[id] ? "translateY(0)" : "translateY(32px)",
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  return (
    <div style={{ fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", background: "#0d0618", color: "#fff", overflowX: "hidden" }}>

      {/* ナビ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 50 ? "rgba(13,6,24,0.95)" : "transparent",
        backdropFilter: scrollY > 50 ? "blur(12px)" : "none",
        borderBottom: scrollY > 50 ? "1px solid rgba(124,58,237,0.2)" : "none",
        padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎨</span>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "0.04em" }}>Commission Tracker</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/login" style={{ color: "#c4b5fd", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>ログイン</a>
          <a href="/login" style={{
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            color: "#fff", borderRadius: 10, padding: "8px 18px", fontSize: 13,
            fontWeight: 700, textDecoration: "none",
            boxShadow: "0 0 20px rgba(124,58,237,0.4)",
          }}>無料で始める</a>
        </div>
      </nav>

      {/* ヒーロー */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "120px 24px 80px", position: "relative", overflow: "hidden",
      }}>
        {/* 背景グロー */}
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "40%", left: "20%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-block", background: "rgba(124,58,237,0.2)",
            border: "1px solid rgba(124,58,237,0.4)", borderRadius: 999,
            padding: "6px 18px", fontSize: 12, color: "#c4b5fd", fontWeight: 700,
            marginBottom: 24, letterSpacing: "0.06em",
          }}>
            🎨 イラスト依頼管理ツール
          </div>

          <h1 style={{
            fontSize: "clamp(36px, 7vw, 72px)", fontWeight: 900,
            lineHeight: 1.15, marginBottom: 24,
            background: "linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #a78bfa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            絵の依頼を、<br />もう迷子にしない。
          </h1>

          <p style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "#a78bfa", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.8 }}>
            依頼状況・納期・金額・画像をまとめて管理。<br />
            絵師への依頼をスッキリ整理できる無料Webアプリ。
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "#fff", borderRadius: 14, padding: "14px 32px",
              fontSize: 15, fontWeight: 800, textDecoration: "none",
              boxShadow: "0 0 40px rgba(124,58,237,0.5)",
              display: "inline-block",
            }}>
              無料で始める →
            </a>
            <a href="/login?demo=1" style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", borderRadius: 14, padding: "14px 32px",
              fontSize: 15, fontWeight: 700, textDecoration: "none",
              display: "inline-block",
            }}>
              🎮 デモを試す
            </a>
          </div>

          <p style={{ fontSize: 12, color: "#6b5a8a", marginTop: 20 }}>クレジットカード不要・登録1分</p>
        </div>

        {/* モックUI */}
        <div style={{
          marginTop: 72, position: "relative", zIndex: 1,
          width: "100%", maxWidth: 720,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 20, padding: "20px", backdropFilter: "blur(8px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)",
        }}>
          {/* モックヘッダー */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "10px 14px", background: "rgba(124,58,237,0.15)", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎨</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#e9d5ff" }}>Commission Tracker</span>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#a78bfa" }}>
              <span>合計 <strong style={{ color: "#fff" }}>5</strong></span>
              <span>進行中 <strong style={{ color: "#fff" }}>3</strong></span>
              <span>完成 <strong style={{ color: "#fff" }}>2</strong></span>
            </div>
          </div>
          {/* モックカード */}
          {[
            { title: "アイコン用イラスト", artist: "花咲りん", status: "制作中", statusColor: "#3b82f6", statusBg: "rgba(59,130,246,0.15)", deadline: "2026/04/05", price: "¥5,000", urgent: true },
            { title: "キャラクターイラスト", artist: "空音そら", status: "ラフ確認中", statusColor: "#8b5cf6", statusBg: "rgba(139,92,246,0.15)", deadline: "2026/04/12", price: "¥12,000", urgent: false },
            { title: "バナー制作", artist: "星野つき", status: "依頼済み", statusColor: "#f59e0b", statusBg: "rgba(245,158,11,0.15)", deadline: "2026/04/20", price: "¥3,500", urgent: false },
          ].map((c, i) => (
            <div key={i} style={{
              background: c.urgent ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)",
              border: c.urgent ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 8,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#f3f0ff" }}>{c.title}</span>
                  <span style={{ background: c.statusBg, color: c.statusColor, borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{c.status}</span>
                  {c.urgent && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>⚠ あと3日</span>}
                </div>
                <div style={{ fontSize: 11, color: "#7c6a99" }}>🖌 {c.artist} ・ ⏰ 納期: {c.deadline}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#e9d5ff" }}>{c.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 機能紹介 */}
      <section style={{ padding: "100px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div id="features" data-animate style={{ textAlign: "center", marginBottom: 60, ...fadeIn("features") }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, marginBottom: 16,
            background: "linear-gradient(135deg,#fff,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            依頼管理に必要な機能が全部揃ってる
          </h2>
          <p style={{ color: "#7c6a99", fontSize: 15 }}>シンプルで使いやすい、絵の依頼専用ツール</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            { icon: "📋", title: "依頼を一元管理", desc: "件名・絵師名・納期・金額・メモをまとめて記録。依頼の迷子がなくなります。", delay: 0 },
            { icon: "🏷️", title: "ステータス管理", desc: "依頼済み・ラフ確認中・制作中・完成・キャンセルの5段階で進捗を管理。", delay: 0.1 },
            { icon: "⚠️", title: "納期アラート", desc: "納期7日前になると自動でハイライト。締め切りを見逃しません。", delay: 0.2 },
            { icon: "📷", title: "画像添付", desc: "ラフ・作業中・完成画像をアップロードして一括管理。種類ごとに整理できます。", delay: 0.3 },
            { icon: "🔢", title: "並び替え・フィルタ", desc: "依頼日・納期・金額・ステータスで並び替え。ステータスでフィルタリングも可能。", delay: 0.4 },
            { icon: "📱", title: "スマホ対応", desc: "PCでもスマホでも快適に使えます。ホーム画面に追加してアプリとして利用可能。", delay: 0.5 },
          ].map((f, i) => (
            <div key={i} id={`feature-${i}`} data-animate style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 16, padding: "28px 24px",
              ...fadeIn(`feature-${i}`, f.delay),
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#e9d5ff", marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "#7c6a99", lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* プラン・料金 */}
      <section style={{ padding: "100px 24px", background: "rgba(124,58,237,0.05)", borderTop: "1px solid rgba(124,58,237,0.1)", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div id="pricing" data-animate style={{ textAlign: "center", marginBottom: 60, ...fadeIn("pricing") }}>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, marginBottom: 16,
              background: "linear-gradient(135deg,#fff,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              シンプルな料金プラン
            </h2>
            <p style={{ color: "#7c6a99", fontSize: 15 }}>まずは無料で試してみてください</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { label: "無料", price: "¥0", period: "", color: "#6b7280", border: "rgba(107,114,128,0.3)", features: ["依頼の登録・管理", "画像 合計10枚まで", "全ステータス対応", "納期アラート"], cta: "無料で始める", delay: 0 },
              { label: "スタンダード", price: "¥300", period: "/月", color: "#3b82f6", border: "rgba(59,130,246,0.4)", features: ["依頼の登録・管理", "画像 合計50枚まで", "全ステータス対応", "納期アラート"], cta: "始める", delay: 0.1, popular: false },
              { label: "プレミアム", price: "¥800", period: "/月", color: "#7c3aed", border: "rgba(124,58,237,0.6)", features: ["依頼の登録・管理", "画像 無制限", "全ステータス対応", "納期アラート", "優先サポート"], cta: "始める", delay: 0.2, popular: true },
            ].map((p, i) => (
              <div key={i} id={`plan-${i}`} data-animate style={{
                background: p.popular ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${p.border}`,
                borderRadius: 20, padding: "32px 24px", position: "relative",
                boxShadow: p.popular ? "0 0 40px rgba(124,58,237,0.3)" : "none",
                ...fadeIn(`plan-${i}`, p.delay),
              }}>
                {p.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", borderRadius: 999, padding: "4px 16px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    おすすめ
                  </div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: p.color, background: `${p.color}20`, borderRadius: 999, padding: "3px 12px" }}>{p.label}</span>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#fff" }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: "#7c6a99" }}>{p.period}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "grid", gap: 10 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#c4b5fd" }}>
                      <span style={{ color: p.color, fontWeight: 700 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <a href="/login" style={{
                  display: "block", textAlign: "center", padding: "12px",
                  background: p.popular ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.08)",
                  border: p.popular ? "none" : `1px solid ${p.border}`,
                  color: "#fff", borderRadius: 12, fontWeight: 700, fontSize: 14,
                  textDecoration: "none",
                }}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "#4a3d5c", marginTop: 24 }}>いつでもキャンセル可能・月額制</p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "100px 24px", maxWidth: 720, margin: "0 auto" }}>
        <div id="faq" data-animate style={{ textAlign: "center", marginBottom: 60, ...fadeIn("faq") }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, marginBottom: 16,
            background: "linear-gradient(135deg,#fff,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            よくある質問
          </h2>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {[
            { q: "無料プランでいつまでも使えますか？", a: "はい、無料プランは期限なく使えます。画像の合計枚数が10枚を超えた場合は有料プランへのアップグレードが必要です。", delay: 0 },
            { q: "支払い方法は何が使えますか？", a: "クレジットカード・デビットカードが使えます。決済はStripeで安全に処理され、カード情報は当サービスには保存されません。", delay: 0.1 },
            { q: "解約はいつでもできますか？", a: "いつでも解約できます。解約後は次の更新日まで引き続きご利用いただけます。", delay: 0.2 },
            { q: "スマホでも使えますか？", a: "はい、スマホ・タブレット・PCすべてに対応しています。SafariやChromeからホーム画面に追加するとアプリのように使えます。", delay: 0.3 },
            { q: "データは安全ですか？", a: "データはSupabaseに安全に保存され、SSL通信・行レベルセキュリティにより他のユーザーからのアクセスは完全に遮断されています。", delay: 0.4 },
          ].map((item, i) => (
            <FaqItem key={i} id={`faq-${i}`} q={item.q} a={item.a} visible={visible} delay={item.delay} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div id="cta" data-animate style={{ position: "relative", zIndex: 1, ...fadeIn("cta") }}>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, marginBottom: 20,
            background: "linear-gradient(135deg,#fff,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            今すぐ無料で始めよう
          </h2>
          <p style={{ color: "#7c6a99", fontSize: 15, marginBottom: 40 }}>登録1分・クレジットカード不要</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/login" style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "#fff", borderRadius: 14, padding: "16px 40px",
              fontSize: 16, fontWeight: 800, textDecoration: "none",
              boxShadow: "0 0 40px rgba(124,58,237,0.5)",
              display: "inline-block",
            }}>
              無料アカウントを作成 →
            </a>
            <a href="/login?demo=1" style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", borderRadius: 14, padding: "16px 40px",
              fontSize: 16, fontWeight: 700, textDecoration: "none",
              display: "inline-block",
            }}>
              🎮 デモを試す
            </a>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer style={{ borderTop: "1px solid rgba(124,58,237,0.2)", padding: "40px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🎨</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#c4b5fd" }}>Commission Tracker</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
            {[
              { href: "/guide", label: "使い方" },
              { href: "/terms", label: "利用規約" },
              { href: "/privacy", label: "プライバシー" },
              { href: "/tokusho", label: "特定商取引法" },
              { href: "/contact", label: "お問い合わせ" },
            ].map(link => (
              <a key={link.href} href={link.href} style={{ fontSize: 12, color: "#4a3d5c", textDecoration: "none" }}>
                {link.label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#2d1f3d" }}>© 2026 Commission Tracker</div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ id, q, a, visible, delay }: { id: string; q: string; a: string; visible: Record<string, boolean>; delay: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div id={id} data-animate style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.2)",
      borderRadius: 14, overflow: "hidden",
      opacity: visible[id] ? 1 : 0,
      transform: visible[id] ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", padding: "18px 20px", background: "none", border: "none",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#e9d5ff" }}>{q}</span>
        <span style={{ color: "#7c3aed", fontSize: 18, transition: "transform 0.3s", transform: open ? "rotate(45deg)" : "rotate(0)" }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 18px", fontSize: 13, color: "#7c6a99", lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  );
}
