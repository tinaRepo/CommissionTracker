"use client";
// ページメタデータ
export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>
      <header className="doc-header">
        <button onClick={() => window.history.back()} className="doc-back-btn">← 戻る</button>
        <span className="title">プライバシーポリシー</span>
      </header>
      <main className="container-narrow" style={{ padding: "32px 24px 80px" }}>
        <p className="text-meta" style={{ marginBottom: 24 }}>最終更新日：2026年10月5日</p>

        <Section title="1. 取得する情報">
          <p>本サービス（ツクリスト）では以下の情報を取得します。</p>
          <ul>
            <li>メールアドレス（アカウント登録時）</li>
            <li>Googleアカウントの情報（Googleでログイン・連携した場合の、氏名・メールアドレス・プロフィール画像）</li>
            <li>表示名（登録時または設定時に入力した名前）</li>
            <li>ログイン方法・最終ログイン日時</li>
            <li>タスク管理データ（件名・依頼先名・連絡先・金額・ステータス・メモ等、ユーザーが入力した情報）</li>
            <li>アップロード画像</li>
            <li>プッシュ通知の購読情報（通知を有効にした端末のブラウザが発行する送信先URLと暗号鍵）</li>
            <li>お問い合わせの内容（お名前・メールアドレス・件名・本文）</li>
            <li>利用ログ・端末情報・Cookie等の識別子（アクセス解析・広告配信に関するもの。詳細は「3」「4」に記載）</li>
          </ul>
        </Section>

        <Section title="2. 情報の利用目的">
          <p>取得した情報は以下の目的で利用します。</p>
          <ul>
            <li>本サービスの提供・運営（認証、データの保存、納期通知の送信を含む）</li>
            <li>ユーザーへの連絡・サポート対応</li>
            <li>有料プランの課金・請求処理</li>
            <li>サービスの改善・新機能の開発、利用状況の分析</li>
            <li>広告の配信（無料で提供するための収益化）</li>
            <li>利用規約違反・不正利用への対応</li>
          </ul>
        </Section>

        <Section title="3. Cookie等の利用">
          <p>本サービスは、以下の目的でCookieまたはこれに類する技術（ローカルストレージ等）を利用します。</p>
          <ul>
            <li>ログイン状態の維持（Supabase認証のセッション）</li>
            <li>前回のログイン方法の記憶（ログイン画面での表示用）</li>
            <li>ホーム画面追加の案内の表示履歴の管理</li>
            <li>アクセス解析（Google Analytics、Vercel Analytics）</li>
            <li>広告配信（Google AdSense）</li>
          </ul>
          <p>ブラウザの設定でCookieを無効にすることができますが、ログインなど一部の機能が利用できなくなる場合があります。</p>
        </Section>

        <Section title="4. アクセス解析・広告配信と外部送信について">
          <p>
            本サービスでは、アクセス解析および広告配信のため、ユーザーの端末から下記の外部事業者へ情報が送信されます
            （電気通信事業法に基づく公表事項を含みます）。
          </p>
          <div style={{ overflowX: "auto", margin: "12px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ background: "var(--bg)", textAlign: "left" }}>
                  <th style={thStyle}>送信先（事業者・サービス）</th>
                  <th style={thStyle}>送信される情報</th>
                  <th style={thStyle}>利用目的</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Google LLC（Google Analytics）</td>
                  <td style={tdStyle}>閲覧したページのURL・閲覧日時、IPアドレス、ブラウザ・OS・端末の種類、参照元、Cookie等の識別子</td>
                  <td style={tdStyle}>サービスの利用状況の分析・改善</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Google LLC（Google AdSense）</td>
                  <td style={tdStyle}>閲覧したページのURL、IPアドレス、ブラウザ・端末の種類、広告の表示・クリック状況、Cookie等の識別子</td>
                  <td style={tdStyle}>広告の配信・表示、効果測定、不正なクリックの防止</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Vercel Inc.（Vercel Analytics）</td>
                  <td style={tdStyle}>閲覧したページのURL、参照元、国・地域、ブラウザ・OS・端末の種類（Cookieを使わない集計）</td>
                  <td style={tdStyle}>サービスの利用状況の分析・表示速度の改善</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Google AdSenseでは、Googleや提携する第三者配信事業者がCookieを使用して、ユーザーが過去に本サービスや他のサイトに
            アクセスした際の情報に基づいて広告を配信することがあります。
          </p>
          <ul>
            <li>
              パーソナライズ広告は、<a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>Googleの広告設定</a>で無効にできます。
            </li>
            <li>
              Googleによるデータの利用方法は、<a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" style={linkStyle}>「Googleのサービスを使用するサイトやアプリから収集した情報のGoogleによる使用」</a>をご確認ください。
            </li>
            <li>
              Google Analyticsによる収集は、<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={linkStyle}>Google Analyticsオプトアウトアドオン</a>で無効にできます。
            </li>
          </ul>
        </Section>

        <Section title="5. 利用する外部サービス（業務の委託先）">
          <p>本サービスは以下の外部サービスを利用しており、各サービスのプライバシーポリシーが適用されます。</p>
          <ul>
            <li>Supabase（データベース・認証・ファイル保存）</li>
            <li>Vercel（ホスティング・アクセス解析）</li>
            <li>Stripe（決済処理。カード情報は当サービスのサーバーには保存されません）</li>
            <li>Resend（メール送信）</li>
            <li>Google（Googleアカウントでのログイン、Google Analytics、Google AdSense）</li>
            <li>各ブラウザ提供事業者のプッシュ通知サービス（Google、Apple、Mozilla等。通知の配信に利用）</li>
          </ul>
        </Section>

        <Section title="6. プッシュ通知">
          <p>
            ユーザーが通知を有効にした場合のみ、納期が近いタスクのお知らせや運営からのお知らせをプッシュ通知で送信します。
            通知は端末ごとに、ユーザーメニューからいつでもオフにできます（ブラウザの設定からも解除できます）。
            通知の宛先情報は、通知をオフにした時またはアカウント削除時に削除されます。
          </p>
        </Section>

        <Section title="7. 第三者提供">
          <p>以下の場合を除き、取得した個人情報を第三者に提供することはありません。</p>
          <ul>
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護のために必要な場合</li>
            <li>「5」の委託先に、利用目的の達成に必要な範囲で取り扱いを委託する場合</li>
          </ul>
        </Section>

        <Section title="8. データの保存期間">
          <p>ユーザーデータはアカウント削除まで保持されます。アカウント削除後は、登録データ・アップロード画像・通知の宛先情報を速やかに削除し、有料プランをご利用中の場合は契約も解約します。</p>
          <p>決済に関する記録は、法令に基づき決済事業者（Stripe）が保管する場合があります。</p>
        </Section>

        <Section title="9. セキュリティ">
          <p>SSL/TLS通信の使用、Supabaseの行レベルセキュリティ（RLS）によるアクセス制御など、適切なセキュリティ対策を実施しています。ただし、インターネット上での完全な安全性を保証するものではありません。</p>
        </Section>

        <Section title="10. 開示・訂正・削除のご請求、お問い合わせ">
          <p>保有する個人情報の開示・訂正・削除のご請求や、個人情報の取り扱いに関するご質問・ご要望は、お問い合わせフォームよりご連絡ください。ご本人であることを確認のうえ、法令に従い対応します。</p>
        </Section>

        <Section title="11. ポリシーの変更">
          <p>本ポリシーは必要に応じて変更することがあります。重要な変更がある場合はサービス上でお知らせします。</p>
        </Section>
      </main>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid var(--border-soft)", fontWeight: 600, color: "var(--fg)",
};
const tdStyle: React.CSSProperties = {
  padding: "10px 12px", borderBottom: "1px solid var(--border-soft)", verticalAlign: "top",
  color: "var(--fg-2)", lineHeight: 1.7,
};
const linkStyle: React.CSSProperties = { color: "var(--accent)" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="doc-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
