"use client";
export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif" }}>
      <header style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 32px #0004" }}>
        <button onClick={() => window.history.back()} style={{ background: "#ffffff18", border: "1px solid #ffffff30", color: "#c4b5fd", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>← 戻る</button>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>プライバシーポリシー</span>
      </header>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
        <p style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>最終更新日：2026年3月23日</p>

        <Section title="1. 取得する情報">
          <p>本サービスでは以下の情報を取得します。</p>
          <ul style={{ fontSize: 14, color: "#444", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>メールアドレス（アカウント登録時）</li>
            <li>表示名（任意で設定した場合）</li>
            <li>依頼管理データ（件名・絵師名・金額・ステータス等、ユーザーが入力した情報）</li>
            <li>アップロード画像</li>
            <li>利用ログ（Vercel Analyticsによるアクセス情報）</li>
          </ul>
        </Section>

        <Section title="2. 情報の利用目的">
          <p>取得した情報は以下の目的で利用します。</p>
          <ul style={{ fontSize: 14, color: "#444", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>本サービスの提供・運営</li>
            <li>ユーザーへの連絡・サポート対応</li>
            <li>サービスの改善・新機能の開発</li>
            <li>利用規約違反への対応</li>
          </ul>
        </Section>

        <Section title="3. 第三者提供">
          <p>以下の場合を除き、取得した情報を第三者に提供することはありません。</p>
          <ul style={{ fontSize: 14, color: "#444", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護のために必要な場合</li>
          </ul>
        </Section>

        <Section title="4. 利用する外部サービス">
          <p>本サービスは以下の外部サービスを利用しており、各サービスのプライバシーポリシーが適用されます。</p>
          <ul style={{ fontSize: 14, color: "#444", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Supabase（データベース・認証）</li>
            <li>Vercel（ホスティング・アクセス解析）</li>
            <li>Stripe（決済処理）</li>
            <li>Resend（メール送信）</li>
          </ul>
        </Section>

        <Section title="5. データの保存期間">
          <p>ユーザーデータはアカウント削除まで保持されます。アカウント削除後は速やかに全データを削除します。</p>
        </Section>

        <Section title="6. セキュリティ">
          <p>SSL/TLS通信の使用、Supabaseの行レベルセキュリティ（RLS）によるアクセス制御など、適切なセキュリティ対策を実施しています。ただし、インターネット上での完全な安全性を保証するものではありません。</p>
        </Section>

        <Section title="7. お問い合わせ">
          <p>個人情報の取り扱いに関するご質問・ご要望は、お問い合わせよりご連絡ください。</p>
        </Section>

        <Section title="8. ポリシーの変更">
          <p>本ポリシーは必要に応じて変更することがあります。重要な変更がある場合はサービス上でお知らせします。</p>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a0a2e", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #ede9fe" }}>{title}</h2>
      <div style={{ fontSize: 14, color: "#444", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}
