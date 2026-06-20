# モノレポ移行メモ

## 概要

Turborepo + pnpm によるモノレポ構成への移行に伴い、  
Vercel・外部サービスの設定変更が必要になる。  
**本番環境への適用は全フェーズの移行完了後に実施すること。**

---

## ⚠️ 移行完了後にやること

### 1. Vercel：Root Directoryの変更

**Settings → General → Root Directory**

```
変更前: （なし / リポジトリルート）
変更後: apps/web
```

**Build & Development Settings（あわせて確認）**

| 項目             | 値             |
| ---------------- | -------------- |
| Build Command    | `next build`   |
| Output Directory | `.next`        |
| Install Command  | `pnpm install` |

設定保存後、**Redeploy** を実行する。

---

### 2. 環境変数の確認

モノレポ移行後も環境変数の内容自体は変わらない。  
Redeployのタイミングで念のため全項目を確認すること。

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
ADMIN_EMAIL=

# アプリURL
NEXT_PUBLIC_APP_URL=https://commission-tracker-nine.vercel.app

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STANDARD_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
CRON_SECRET=
```

---

### 3. 動作確認チェックリスト

Redeploy完了後、以下をすべて確認してからリリースとする。

- [ ] ログインできる（メール・Google）
- [ ] 依頼一覧が表示される
- [ ] 依頼の登録・編集・削除ができる
- [ ] 画像アップロードができる
- [ ] Stripeの課金ページが開く
- [ ] プッシュ通知が動く
- [ ] 管理者ページにアクセスできる
- [ ] お問い合わせメールが届く
- [ ] Cron Job（納期通知）が動く

---

## 移行フェーズ進捗

| フェーズ | 内容                                    | 状態     |
| -------- | --------------------------------------- | -------- |
| 1        | モノレポ基盤構築・apps/web/ 移動        | ✅ 完了   |
| 2        | packages/types/ 作成                    | ✅ 完了   |
| 3        | packages/supabase/ 作成                 | ✅ 完了   |
| 4        | packages/hooks/ 作成                    | ✅ 完了   |
| 5        | apps/web/ 整備（packages/への切り替え） | ✅ 完了   |
| 6        | apps/mobile/ 構築（Expo）               | 🔄 進行中 |
| 7        | CI/CD・Vercel本番適用                   | 🔲 未着手 |

---

## apps/mobile/ 実装状況

| 画面・機能                   | 状態     |
| ---------------------------- | -------- |
| ログイン・新規登録・リセット | ✅ 完了   |
| 依頼一覧                     | ✅ 完了   |
| 依頼詳細                     | ✅ 完了   |
| 依頼新規登録                 | ✅ 完了   |
| 依頼編集                     | ✅ 完了   |
| 依頼削除                     | ✅ 完了   |
| 画像アップロード・表示       | 🔲 未着手 |
| プッシュ通知                 | 🔲 未着手 |
| お知らせ・バージョン情報     | 🔲 未着手 |
| お問い合わせ                 | 🔲 未着手 |
| プラン・課金                 | 🔲 未着手 |
| 管理者ページ                 | 🔲 未着手 |
| Google認証                   | 🔲 未着手 |

---

## apps/mobile/ 技術メモ

- **パッケージ管理**: npm（pnpmとの互換性問題のためapps/mobile/のみ独立）
- **packages/ との同期**: `npm run sync` で手動同期（`scripts/sync-packages.js`）
- **Supabaseクライアント**: `@supabase/supabase-js` を直接使用（`@supabase/ssr` はブラウザ専用のため不可）
- **日付ピッカー**: `react-native-modal-datetime-picker` + `@react-native-community/datetimepicker`
- **ルーティング**: Expo Router（ファイルベース）

---

## 備考

- フェーズ1〜5完了時点でローカルでの動作確認済み
- Vercel本番への適用はフェーズ7で実施
- `dev` ブランチで開発 → 全フェーズ完了後に `main` へマージ
- `apps/mobile/lib/packages/supabase/client.ts` はWeb版と異なるため `npm run sync` でスキップされる
