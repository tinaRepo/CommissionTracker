# Stripe設定・運用ガイド

このガイドはツクリスト v2.0.0 のStripe設定を対象とします。ProductionとPreviewでStripe mode、APIキー、Price ID、Webhook endpoint secret、Portal Configuration IDを混ぜないでください。

## 課金仕様

| 操作 | アプリの動作 |
| --- | --- |
| 新規契約 | Checkoutで月額サブスクリプションを作成 |
| スタンダードからプレミアムへアップグレード | Customer Portalから変更。残り期間分の差額を按分し、即時請求 |
| 解約 | 契約期間終了時の解約を予約。期間終了までは有料プランを利用可能 |
| 通常解約時の返金 | 自動返金なし。返金の相談は `support@tsukurist.com` で受付 |
| アカウント削除 | 通常解約とは別にSubscriptionを即時解約。残り期間の自動返金なし |

Customer Portalで許可する変更先はプレミアムPriceです。アプリ内から有料契約中に新しいCheckoutを作るのではなく、プラン・支払い管理からPortalを利用します。

## Production / Test mode

Stripe DashboardにはTest modeとLive modeがあります。それぞれに別の商品・Price・Webhook endpoint・Portal Configurationがあります。

- Preview / 検証環境はTest modeのキーとリソースを設定します。
- ProductionはLive modeのキーとリソースを設定します。
- VercelのEnvironment VariablesをProductionとPreviewに分けて登録し、値を取り違えないでください。
- Stripe Test modeの決済は実際のカード請求ではありません。アプリの状態遷移やWebhookを検証するためのテストです。

## 商品とPriceの作成

Test modeとLive modeのそれぞれで設定します。

1. Stripe Dashboardの **Product catalog** で商品「スタンダード」と「プレミアム」を作成します。
2. 各商品に毎月請求（recurring / monthly）のPriceを作成します。
   - スタンダード: JPY 300
   - プレミアム: JPY 800
3. 有効なPrice ID（`price_...`）を控え、対応する環境の変数に登録します。

| 環境変数 | 用途 |
| --- | --- |
| `STRIPE_STANDARD_PRICE_ID` | Checkoutとサーバー側のPrice検証 |
| `STRIPE_PREMIUM_PRICE_ID` | Checkout、Portalの変更先、サーバー側のPrice検証 |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | ブラウザー側のプラン表示・選択 |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | ブラウザー側のプラン表示・選択 |

WebhookはPrice IDを使ってプランを判定します。環境変数を間違えると未知のPriceとして処理が失敗し、WebhookはStripeから再送されます。サーバー用と `NEXT_PUBLIC_` 用は同じ環境のPrice IDに揃えてください。

## APIキーと環境変数

Stripe APIキーをVercelの該当環境に設定します。

| 環境変数 | 設定内容 |
| --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 同じmodeの公開可能キー |
| `STRIPE_SECRET_KEY` | 同じmodeの秘密キー。クライアントへ公開しない |
| `STRIPE_WEBHOOK_SECRET` | 同じ環境のWebhook endpoint signing secret |
| `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` | 同じmodeで作成したPortal ConfigurationのID |
| Price ID 4項目 | 上表の各Price ID |

Portal APIは、Customer Portal設定を取得・必要に応じて更新し、Portal sessionを作成します。API keyには該当するStripeリソースの読み取り・書き込み権限が必要です。少なくとも、Pricesのread、Billing Portal Configurationsのread/write、Billing Portal Sessionsのwrite、Customersのwrite、Checkout Sessionsのwrite、Subscriptionsのread/writeを許可してください。制限付きAPIキーを使う場合は、Stripeの権限名と使用中APIバージョンをDashboardで確認します。

## Customer Portal設定

1. Test mode / Live modeそれぞれでBilling → Customer portalの設定を作成し、Configuration ID（`bpc_...`）を控えます。
2. 各環境の `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` に該当するIDを設定します。
3. Portalを開くAPIは既存Configurationを読み取り、次の動作になるよう必要な機能を更新します。
   - 解約を有効化し、期間終了時に解約（`at_period_end`）
   - 解約時の按分処理なし
   - サブスクリプションのPrice変更を有効化
   - 変更先をプレミアムPriceに限定
   - アップグレード時は按分額を即時請求（`always_invoice`）
4. この設定更新にはBilling Portal Configurationへの書き込み権限が必要です。設定更新に失敗する場合は、Stripe API keyの権限とPriceの有効性を確認します。

Portalの戻り先は利用中のアプリoriginの `/pricing?billing=return` です。

## Webhook設定

Test modeとLive modeでそれぞれWebhook endpointを追加します。

- Production: `https://tsukurist.com/api/stripe/webhook`
- Preview: 対象Vercel Preview URLの `/api/stripe/webhook`

次のイベントを購読し、表示されたSigning secret（`whsec_...`）をその環境の `STRIPE_WEBHOOK_SECRET` に登録します。

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.paid`

変更後はVercelを再デプロイします。Webhookの冪等性記録に使うSupabaseの `stripe_events` テーブルが存在する必要があります。migrationの確認・適用は[DB運用ガイド](./database-operations.md)を参照してください。

Webhookはイベントを受信後、必要に応じてStripeからSubscriptionの最新状態を取得し、Supabaseのプラン状態を更新します。重複イベントは一度だけ処理します。処理に失敗した場合はイベント記録を解除して500を返し、Stripeの再送を可能にします。

## 検証手順

Preview環境とTest modeで、実際の画面操作を使って確認してください。

1. Test modeのキー、Price ID、Portal Configuration ID、Webhook secretがPreviewに設定されていることを確認します。
2. テストユーザーでスタンダードを契約し、Checkoutからアプリへ戻ることを確認します。
3. Stripe Dashboard → **Developers → Webhooks → Event deliveries** でCheckoutとSubscription関連Webhookが成功していることを確認します。
4. アプリの現在プランがスタンダードになり、Stripe DashboardのCustomer / Subscription情報と一致することを確認します。
5. プラン・支払い管理からプレミアムへ変更し、差額の按分請求が発生してプラン表示もプレミアムになることを確認します。
6. 解約を予約し、期間終了日が表示され、期間中はプレミアムが維持されることを確認します。解約予約だけで返金されないことも確認します。
7. 決済失敗時は支払い方法の更新案内が表示され、支払い復旧後はWebhookによりプラン状態が戻ることを確認します。

テストを繰り返す際は、既存のテストSubscriptionやCustomer Portalの状態を確認し、想定外の継続課金状態を残さないでください。

## トラブルシューティング

### 「プラン管理の設定が完了していません」と表示される

- `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` が未設定、または別modeのIDでないか確認します。
- `STRIPE_STANDARD_PRICE_ID` と `STRIPE_PREMIUM_PRICE_ID` の両方が設定されているか確認します。
- Priceが有効な月額JPY recurring Priceか確認します。
- Stripe API keyにPortal Configurationのread/write権限があるか確認します。
- Vercelの環境変数を変更した場合は再デプロイします。

### Checkout後にプランが反映されない

- Webhook endpointが正しい環境・modeにあり、イベント配信が成功しているか確認します。
- `STRIPE_WEBHOOK_SECRET` とPrice IDがendpointと同じmodeのものか確認します。
- Vercel Function LogsでWebhook署名・DB更新エラーを調べます。
- `stripe_events` migrationと `user_profiles` のStripe関連列が適用済みか確認します。

### 支払い・返金額が想定と異なる

- アップグレードは旧プランを返金して新規契約する方式ではなく、Stripeの残り期間分の按分請求です。
- 通常解約では自動返金しません。契約は期間終了時に終了します。
- 過去の複数請求・按分InvoiceはStripe DashboardのCustomer → Subscription → Invoicesで個別に確認します。返金が必要な場合はサポートへ連絡してください。

### Stripeからアプリに戻ると表示が古い

Portalから戻った後の画面同期とWebhook配信を確認します。Stripe Dashboardのイベント配信成功だけでは、ブラウザー画面が更新されたことまでは保証されないため、画面を再読み込みして表示を確認してください。
