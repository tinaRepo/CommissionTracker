# 独自ドメイン・メール運用ガイド

## 現在の構成

- 本番サイト: `https://tsukurist.com`
- Vercel Preview: デプロイごとの `*.vercel.app` URL
- サポート窓口: `support@tsukurist.com`
- 自動通知の送信元: `noreply@tsukurist.com`
- 送信サービス: Resend。受信はCloudflare Email Routingまたは別のメールボックスサービスが必要

サイトの正規URLは `lib/site.ts` の `SITE_URL` で定義し、metadata、sitemap、法的表記などで使います。環境に応じた通知リンクには `NEXT_PUBLIC_APP_URL` を使います。Stripe CheckoutとCustomer Portalの戻り先は、APIリクエストのoriginから生成されます。

## Vercelの環境変数

| 変数 | Production | Preview | 用途 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://tsukurist.com` | 対象のVercel Preview URL | メール・プッシュ通知などのリンク先 |
| `SUPPORT_EMAIL` | `support@tsukurist.com` | `support@tsukurist.com` | サポート連絡先、問い合わせ・管理通知 |
| `NOREPLY_EMAIL` | `noreply@tsukurist.com` | `noreply@tsukurist.com` | ユーザー向け自動メールの送信元 |
| `RESEND_API_KEY` | Resend APIキー | Resend APIキー | ドメイン認証済みのメール送信 |

Previewも実ドメインから送信し、サポート通知の受信先も本番と共通です。Previewで問い合わせ・削除申請・決済通知を試す場合は、本番の受信箱へ届くことに注意してください。環境変数変更後は再デプロイしてください。

## Cloudflare DNSとVercelドメイン

1. VercelのProject → **Settings → Domains** で `tsukurist.com` と `www.tsukurist.com` を設定します。`www.tsukurist.com` はVercel側で `tsukurist.com` にリダイレクトします。
2. Vercelが表示するDNSレコードをCloudflare DNSに登録します。Vercelの案内に応じてAまたはCNAMEを設定してください。
3. メール用のMX/TXTレコードやResendの検証レコードを削除・上書きしないでください。DNSのプロキシ設定はVercelの案内に従います。
4. `https://tsukurist.com` と `https://www.tsukurist.com` のHTTPSおよびリダイレクトを確認します。

## Resendによるメール送信

1. Resendに `tsukurist.com` を登録します。
2. Resendが提示するDKIM、SPF等のレコードをCloudflare DNSにそのまま設定し、Resend側で認証済みになるまで待ちます。SPF TXTレコードを複数作らないようにしてください。
3. API Keyを作成してVercelのProductionとPreviewに `RESEND_API_KEY` として設定します。可能なら送信専用の権限に絞ります。
4. ProductionとPreviewの両方で `SUPPORT_EMAIL` と `NOREPLY_EMAIL` を上表の値に設定します。

メールの送信元・件名・本文は `lib/email-templates.ts` に集約されています。メール文面の変更は同ファイルを編集します。

Resendは送信サービスです。`support@tsukurist.com` 宛のメールを受け取るには、Cloudflare Email Routingで既存の受信箱に転送するか、メールボックスサービスを利用してください。ドメイン取得だけでメールボックスは作成されません。

### Supabase Authメール

Supabase Dashboard → **Project Settings → Authentication → SMTP Settings** でカスタムSMTPを使う場合は、Resend SMTP情報を設定し、送信元アドレスに `noreply@tsukurist.com` を指定します。認証メールのリンクはSupabaseの **Authentication → URL Configuration** とEmail Templatesの設定にも依存します。

## Supabase認証リダイレクト

Supabase Dashboard → **Authentication → URL Configuration**:

- 本番のSite URLは `https://tsukurist.com`。
- Redirect URLsには `https://tsukurist.com/**` と、利用するPreview URL（およびローカル開発URL）を登録します。
- Google OAuthのGoogle Cloud側redirect URIはSupabaseのCallback URL `https://<project-ref>.supabase.co/auth/v1/callback` です。アプリの独自ドメインではありません。

Google OAuthの詳細やパスワードリセット用テンプレートは[Googleログイン設定](./google-login.md)を参照してください。

## Stripe

- ProductionはStripe Live modeのキー、Price ID、Portal Configuration ID、Webhook signing secretを使用します。PreviewはStripe Test modeの値に分けることを推奨します。
- Webhook URLは本番で `https://tsukurist.com/api/stripe/webhook`、Previewは検証に使う安定したPreview URLの `/api/stripe/webhook` です。Preview URLがデプロイごとに変わる場合は、Stripe Test modeのendpointも現在のURLに更新するか、安定したPreview aliasを使用します。各Webhook endpointの署名シークレットを対応する環境に設定してください。
- CheckoutとCustomer Portalの戻り先はリクエストoriginを使うため、通常はドメイン変更のためのコード修正は不要です。
- Customer Portal設定、アップグレード時の按分請求、解約時の扱いは[Stripe運用ガイド](./stripe-guide.md)を参照してください。

## SEO・公開ファイル

- 正規URLの変更が必要な場合は `lib/site.ts` の `SITE_URL` と `public/robots.txt` のサイトマップURLを更新し、公開ページのmetadataも確認します。`lib/seo.ts` はこの定数を再エクスポートします。
- `app/sitemap.ts` がサイトマップを生成し、`public/robots.txt` は静的ファイルとして配信されます。robots.txtがPreviewを自動的に遮断するわけではないため、Previewを検索対象外にしたい場合は別途アクセス制御を検討してください。
- `public/ads.txt` は静的配信です。広告事業者やPublisher IDを変更する場合に内容を更新します。
- Search Consoleには本番URLを登録し、`https://tsukurist.com/sitemap.xml` を送信します。

## 切り替え後の確認

- [ ] 本番サイトが `https://tsukurist.com` で表示され、wwwから正規URLへ移動する
- [ ] メール・Googleログイン・パスワード再設定後に正しい環境へ戻る
- [ ] Resend経由で問い合わせ通知・自動返信が送信され、support宛の受信メールが届く
- [ ] ProductionとPreviewのStripeキー、Price ID、Webhook secretがそれぞれのStripe modeに対応している
- [ ] Stripe Checkout完了後にアプリへ戻り、Webhook後にプラン状態が反映される
- [ ] `/sitemap.xml`、`/robots.txt`、`/ads.txt` を本番ドメインから確認する
- [ ] プッシュ通知のリンク先が対象環境のURLになっている
- [ ] `/api/health` が200を返す
