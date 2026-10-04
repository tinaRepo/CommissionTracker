"use client";
// ページメタデータ
export default function TokushoPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>
      <header className="doc-header">
        <button onClick={() => window.history.back()} className="doc-back-btn">← 戻る</button>
        <span className="title">特定商取引法に基づく表記</span>
      </header>
      <main className="container-narrow" style={{ padding: "32px 24px 80px" }}>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {[
              ["販売業者", "請求があった場合は遅滞なく開示します"],
              ["運営責任者", "中沢拓真"],
              ["所在地", "請求があった場合は遅滞なく開示します"],
              ["電話番号", "お問い合わせいただいた場合に遅滞なく開示いたします"],
              ["メールアドレス・お問い合わせ", "amukat0823@gmail.com"],
              ["サービス名", "ツクリスト"],
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
              <tr key={label} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: "14px 12px", fontWeight: 700, color: "var(--muted)", width: 200, verticalAlign: "top", background: "var(--bg)", fontSize: 13, whiteSpace: "nowrap" }}>{label}</td>
                <td style={{ padding: "14px 12px", color: "var(--fg-2)", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </main>
    </div>
  );
}
