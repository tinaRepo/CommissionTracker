"use client";
export default function TokushoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
      <header style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 32px #0004" }}>
        <button onClick={() => window.history.back()} style={{ background: "#ffffff18", border: "1px solid #ffffff30", color: "#c4b5fd", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>← 戻る</button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>特定商取引法に基づく表記</span>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>

        <div style={{ background: "#ede9fe", borderRadius: 12, padding: "14px 18px", marginBottom: 32, fontSize: 13, color: "#5b21b6", lineHeight: 1.7 }}>
          ※ 個人運営のサービスのため、氏名・住所等の個人情報は本ページには掲載しておりません。<br />
          お問い合わせいただいた場合は、遅滞なく開示いたします。
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {[
              ["販売業者", "個人（詳細はお問い合わせにより開示）"],
              ["運営責任者", "個人（詳細はお問い合わせにより開示）"],
              ["所在地", "お問い合わせいただいた場合に遅滞なく開示いたします"],
              ["電話番号", "お問い合わせいただいた場合に遅滞なく開示いたします"],
              ["メールアドレス", "お問い合わせフォームよりご連絡ください"],
              ["サービス名", "Commission Tracker"],
              ["サービスURL", "https://commission-tracker-nine.vercel.app"],
              ["販売価格", "無料プラン：0円\nスタンダードプラン：料金表に準ずる\nプレミアムプラン：料金表に準ずる"],
              ["代金の支払い方法", "クレジットカード決済（Stripe）"],
              ["代金の支払い時期", "有料プラン申込時にお支払いいただきます"],
              ["サービス提供時期", "お支払い完了後、即時にサービスをご利用いただけます"],
              ["返品・キャンセル", "デジタルコンテンツの性質上、原則として返金・キャンセルは承っておりません。ただし、法令に基づく場合はこの限りではありません。"],
              ["動作環境", "最新バージョンのChrome・Safari・Firefox・Edge（インターネット接続が必要）"],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "14px 12px", fontWeight: 700, color: "#555", width: 180, verticalAlign: "top", background: "#f8f7ff", fontSize: 13 }}>{label}</td>
                <td style={{ padding: "14px 12px", color: "#222", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 32, padding: "16px 18px", background: "#f8f7ff", borderRadius: 12, fontSize: 13, color: "#666", lineHeight: 1.7 }}>
          上記内容についてご不明な点がございましたら、<a href="/contact" style={{ color: "#7c3aed", fontWeight: 600 }}>お問い合わせフォーム</a>よりご連絡ください。
        </div>
      </main>
    </div>
  );
}
