"use client";
export default function TokushoPage() {
  return (
    <div style={{ minHeight:"100vh", background:"#faf8f5", fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
      <header style={{ background:"linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)", padding:"20px 24px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 4px 32px #0004" }}>
        <button onClick={() => window.history.back()} style={{ background:"#ffffff18", border:"1px solid #ffffff30", color:"#c4b5fd", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontWeight:600 }}>← 戻る</button>
        <span style={{ color:"#fff", fontSize:18, fontWeight:800 }}>特定商取引法に基づく表記</span>
      </header>
      <main style={{ maxWidth:720, margin:"0 auto", padding:"32px 24px 80px" }}>

        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <tbody>
            {[
              ["販売業者", "請求があった場合は遅滞なく開示します"],
              ["運営責任者", "中沢拓真"],
              ["所在地", "請求があった場合は遅滞なく開示します"],
              ["電話番号", "お問い合わせいただいた場合に遅滞なく開示いたします"],
              ["メールアドレス・お問い合わせ", "amukat0823@gmail.com"],
              ["サービス名", "Commission Tracker"],
              ["サービスURL", "https://commission-tracker-nine.vercel.app"],
              ["販売価格",
                "■ 無料プラン：0円\n■ スタンダードプラン：月額300円（税込）\n■ プレミアムプラン：月額800円（税込）\n※料金はすべて日本円・税込表示"],
              ["代金の支払い方法", "クレジットカード決済（Stripe）\n対応カード：Visa・Mastercard・American Express・JCB等"],
              ["代金の支払い時期", "有料プラン申込時に初回請求が発生します。以降は毎月同日に自動で請求されます。"],
              ["サービス提供時期", "お支払い完了後、即時にサービスをご利用いただけます。"],
              ["サービス提供方法", "インターネット上のWebアプリケーションとして提供します。"],
              ["契約期間", "月単位の自動更新制です。解約するまで毎月自動で更新されます。"],
              ["解約・キャンセル",
                "カスタマーポータル（アプリ内のプラン管理画面）からいつでも解約できます。\n解約後は次の更新日まで引き続きサービスをご利用いただけます。\n解約後の残存期間に対する返金は原則として行いません。"],
              ["返品・返金ポリシー",
                "デジタルコンテンツの性質上、原則として返金・キャンセルは承っておりません。\nただし、サービスの重大な不具合等により提供できなかった場合はこの限りではありません。\nご不明な点はお問い合わせフォームよりご連絡ください。"],
              ["動作環境", "最新バージョンのChrome・Safari・Firefox・Edge（インターネット接続が必要）"],
              ["個人情報の取り扱い", "プライバシーポリシー（https://commission-tracker-nine.vercel.app/privacy）に従い適切に管理します。"],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom:"1px solid #e5e7eb" }}>
                <td style={{ padding:"14px 12px", fontWeight:700, color:"#555", width:200, verticalAlign:"top", background:"#f8f7ff", fontSize:13, whiteSpace:"nowrap" }}>{label}</td>
                <td style={{ padding:"14px 12px", color:"#222", lineHeight:1.8, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop:32, padding:"16px 18px", background:"#f8f7ff", borderRadius:12, fontSize:13, color:"#666", lineHeight:1.7 }}>
          上記内容についてご不明な点がございましたら、<a href="/contact" style={{ color:"#7c3aed", fontWeight:600 }}>お問い合わせフォーム</a>よりご連絡ください。
        </div>
      </main>
    </div>
  );
}
