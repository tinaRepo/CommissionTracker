# 🎨 Commission Tracker

絵の依頼をまとめて管理できる Web アプリです。依頼する側・受ける側（絵師）の両方を対象としています。

**技術構成:** Next.js 14 (App Router) + Supabase + Vercel

---

## 目次

1. [Supabase セットアップ](#1-supabase-セットアップ)
2. [ローカル動作確認（任意）](#2-ローカル動作確認任意)
3. [Vercel デプロイ](#3-vercel-デプロイ)
4. [外部サービス設定](#4-外部サービス設定)
5. [管理者設定](#5-管理者設定)
6. [機能一覧](#6-機能一覧)
7. [プラン制限](#7-プラン制限)

---

## 1. Supabase セットアップ

### 1-1. プロジェクト作成

[supabase.com](https://supabase.com) → **New project** でプロジェクトを作成します。

### 1-2. DB・RLS・Storage の構築

**supabase-migration-guide.md** を参照して、マイグレーションを実施してください。

### 1-3. 認証プロバイダーの設定

**Dashboard → Authentication → Providers** で以下を有効化します。

**Email**
- デフォルトで有効
- *Confirm email* はオフ推奨（開発中）

**Google**
1. [Google Cloud Console](https://console.cloud.google.com) で OAuth アプリを作成
2. Client ID / Secret を Supabase の Google プロバイダー設定に入力
3. Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

> 📄 詳細な設定手順（Manual Linkingの有効化を含む）は `docs/google-login-setup.md` を参照してください。

### 1-4. URL Configuration

**Dashboard → Authentication → URL Configuration** で設定します。

| 項目          | 値                               |
| ------------- | -------------------------------- |
| Site URL      | `https://your-app.vercel.app`    |
| Redirect URLs | `https://your-app.vercel.app/**` |

### 1-5. API キーの確認

**Dashboard → Project Settings → Data API** で以下をメモしておきます。

| 項目             | 環境変数名                                         |
| ---------------- | -------------------------------------------------- |
| Project URL      | `NEXT_PUBLIC_SUPABASE_URL`                         |
| anon public key  | `NEXT_PUBLIC_SUPABASE_ANON_KEY`                    |
| service_role key | `SUPABASE_SERVICE_ROLE_KEY` ⚠️ 外部に漏らさないこと |

---

## 2. ローカル動作確認（任意）

`vercel dev` を使うと、コミット・デプロイなしでローカルから本番 DB に接続してアプリを確認できます。

### 初回セットアップ（1 回だけ）

```bash
# 1. Vercel CLI をインストール
npm i -g vercel

# 2. 依存パッケージをインストール
npm install

# 3. Vercel プロジェクトと紐付け（ブラウザでログイン・プロジェクト選択）
vercel link

# 4. 環境変数をローカルに取得（手入力不要）
vercel env pull .env.local

# 5. .env.local を Git 管理対象外にする
echo ".env.local" >> .gitignore
```

> ⚠️ `.env.local` には本番 DB の接続情報が含まれるため、**絶対にコミットしないでください。**

### 起動

```bash
vercel dev
```

`http://localhost:3000` でアプリが起動します。HTML も API も全てローカルで動作します。

---

## 3. Vercel デプロイ

1. GitHub にリポジトリを push する
2. [Vercel](https://vercel.com) → **Add New Project** → リポジトリを選択
3. **Environment Variables** に以下を追加してデプロイ

| 環境変数                               | 値                            | 備考                              |
| -------------------------------------- | ----------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase の Project URL       |                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Supabase の anon key          |                                   |
| `SUPABASE_SERVICE_ROLE_KEY`            | Supabase の service_role key  | ⚠️ サーバーサイド専用              |
| `RESEND_API_KEY`                       | Resend の API キー            |                                   |
| `ADMIN_EMAIL`                          | 削除申請メールの受信アドレス  |                                   |
| `NEXT_PUBLIC_APP_URL`                  | Vercel のデプロイ URL         | 例: `https://your-app.vercel.app` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`   | Stripe の公開鍵               |                                   |
| `STRIPE_SECRET_KEY`                    | Stripe の秘密鍵               | ⚠️ サーバーサイド専用              |
| `STRIPE_WEBHOOK_SECRET`                | Stripe Webhook のシークレット |                                   |
| `STRIPE_STANDARD_PRICE_ID`             | スタンダードプランの Price ID | サーバーサイド用                  |
| `STRIPE_PREMIUM_PRICE_ID`              | プレミアムプランの Price ID   | サーバーサイド用                  |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | スタンダードプランの Price ID | フロント用                        |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`  | プレミアムプランの Price ID   | フロント用                        |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | Web Push の公開鍵             |                                   |
| `VAPID_PRIVATE_KEY`                    | Web Push の秘密鍵             |                                   |
| `VAPID_EMAIL`                          | Web Push 送信元メール         | 例: `mailto:xxx@example.com`      |
| `CRON_SECRET`                          | Cron Job 認証用シークレット   |                                   |

> ⚠️ 環境変数を追加・変更した後は必ず **Redeploy** すること

---

## 4. 外部サービス設定

### Resend（メール送信）

アカウント削除申請の通知メール、お問い合わせフォームの管理者通知・ユーザー自動返信メールに使用します。

1. [resend.com](https://resend.com) でアカウント作成（無料・月 3,000 通まで）
2. **Dashboard → API Keys → Create API Key** で発行
3. 発行したキーを `RESEND_API_KEY` として Vercel に設定
4. `ADMIN_EMAIL` に受信先アドレスを設定

> 無料プランは `onboarding@resend.dev` からの送信のみ。独自ドメインで送信したい場合は DNS 設定が必要です。

### Stripe（サブスクリプション）

月額課金（スタンダード・プレミアム）に使用します。

1. [stripe.com](https://stripe.com) でアカウント作成
2. **Products** でスタンダード（¥300/月）・プレミアム（¥800/月）の商品を作成
3. 各 Price ID を環境変数に設定
4. **Webhooks** に `https://your-app.vercel.app/api/stripe/webhook` を登録し、`checkout.session.completed` / `customer.subscription.deleted` イベントを有効化

> テストキー（`sk_test_`）と本番キー（`sk_live_`）を混在させないこと。

### Web Push（プッシュ通知）

毎朝 8 時の納期リマインダー通知に使用します。

```bash
# VAPID キーペアの生成
npx web-push generate-vapid-keys
```

生成された公開鍵・秘密鍵をそれぞれ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` に設定します。

> iOS でのプッシュ通知はホーム画面追加（PWA）が必須です（iOS 16.4 以降）。

---

## 5. 管理者設定

1. アプリにアクセスして**新規登録**する
2. **Dashboard → Authentication → Users** から自分の UUID をコピー
3. **SQL Editor** で以下を実行：

```sql
update user_profiles
set is_admin = true
where id = 'ここに UUID を貼る';
```

4. ログイン後、右上のユーザーメニュー → **「⚙ 管理者ページ」** から管理画面へ

管理者ページ URL: `/mgmt-c7f2a91e`（推測されにくい形式）
お知らせ・バージョン管理 URL: `/mgmt-c7f2a91e/notifications`

---

## 6. 機能一覧

**依頼管理**
- ✅ 依頼の登録・編集・削除
- ✅ ステータス管理（依頼済み / ラフ確認中 / 制作中 / 完成 / キャンセル）
- ✅ 納期 7 日前の警告表示
- ✅ ステータス・並び替えフィルタ
- ✅ カレンダービュー（月・週）

**画像**
- ✅ 依頼登録時に画像をまとめてアップロード（新規登録フォームから追加可能）
- ✅ ラフ・作業中・完成・その他の画像アップロード（Supabase Storage）
- ✅ 一覧カードにサムネイル表示（最初の 1 枚）
- ✅ 画像の拡大プレビュー・削除・ダウンロード（元画質保持）
- ✅ プランごとの画像枚数制限

**認証・アカウント**
- ✅ メール / パスワード・Google ログイン
- ✅ パスワードリセット（メール送信）
- ✅ 表示名の設定
- ✅ アカウント削除申請（Resend でメール通知）
- ✅ ユーザーごとにデータが完全分離（RLS）
- ✅ パスワードの設定・変更（ログイン後の画面から。Google登録ユーザーは初回設定可）
- ✅ 直近のログイン方法の表示（Googleログイン時にアバターへバッジ表示）
- ✅ ログイン画面での前回ログイン方法の表示（HttpOnly Cookie + サーバーAPI経由、DBが正）
- ✅ メールアドレス登録時の表示名必須入力
- ✅ Googleアカウント登録時、Google側の名前を表示名として自動反映
- ✅ 最終ログイン日時の記録

**通知**
- ✅ プッシュ通知（毎朝 8 時・納期 7 日以内）
- ✅ お知らせ・リリースノート（未読バッジ通知・モーダル表示）
- ✅ お問い合わせフォーム（モーダル表示・管理者通知・ユーザー自動返信）

**課金**
- ✅ Stripe サブスク（月額課金・解約・カスタマーポータル）

**管理者**
- ✅ ユーザー一覧・プラン変更・ユーザー削除
- ✅ お知らせ管理（登録・編集・削除）
- ✅ バージョン管理（登録・編集・削除・更新内容管理）

**UI / UX**
- ✅ 全モーダル固定サイズ統一（`height: calc(100vh - 32px)` + `maxHeight: 600`）
- ✅ タイトル・ボタン固定 / コンテンツスクロールのモーダル構造
- ✅ モーダル表示時の背景スクロールロック（iOS Safari 対応）
- ✅ ユーザーメニューのテキスト折り返し防止

**その他**
- ✅ デモモード（ログイン不要・メモリのみ・お知らせ・お問い合わせボタン付き）
- ✅ PWA 対応（ホーム画面追加）
- ✅ LP・利用規約・プライバシーポリシー・特定商取引法ページ

---

## 7. プラン制限

| プラン       | 月額 | 画像保存（アカウント合計） |
| ------------ | ---- | -------------------------- |
| 無料         | ¥0   | 10 枚まで                  |
| スタンダード | ¥300 | 50 枚まで                  |
| プレミアム   | ¥800 | 無制限                     |
