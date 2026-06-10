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

| フェーズ | 内容                              | 状態      |
| -------- | --------------------------------- | --------- |
| 1        | モノレポ基盤構築・apps/web/ 移動  | ✅ 完了   |
| 2        | packages/types/ 作成              | 🔲 未着手 |
| 3        | packages/supabase/ 作成           | 🔲 未着手 |
| 4        | packages/hooks/ 作成              | 🔲 未着手 |
| 5        | apps/mobile/ 構築（Expo）         | 🔲 未着手 |
| 6        | CI/CD・Vercel本番適用             | 🔲 未着手 |

---

## 備考

- フェーズ1完了時点でローカルでの動作確認済み
- Vercel本番への適用はフェーズ6で実施
- `dev` ブランチで開発 → 全フェーズ完了後に `main` へマージ
