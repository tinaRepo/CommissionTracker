# 🎨 Commission Tracker

絵の依頼をまとめて管理できるアプリです。依頼する側・受ける側（絵師）の両方を対象としています。
Web（Next.js）とモバイル（Expo / React Native）の両方で利用できます。

**技術構成:** Next.js 14 (App Router) + Expo + Supabase + Vercel + Turborepo (pnpm)

---

## 目次

1. [モノレポ構成](#1-モノレポ構成)
2. [Supabase セットアップ](#2-supabase-セットアップ)
3. [Web版：ローカル動作確認](#3-web版ローカル動作確認)
4. [Web版：Vercel デプロイ](#4-web版vercel-デプロイ)
5. [モバイル版：ローカル動作確認](#5-モバイル版ローカル動作確認)
   - [5-5. トラブルシューティング](#5-5-トラブルシューティングwindows--pnpm--androidビルド)
6. [外部サービス設定](#6-外部サービス設定)
7. [管理者設定](#7-管理者設定)
8. [機能一覧](#8-機能一覧)
9. [プラン制限](#9-プラン制限)

---

## 1. モノレポ構成

```
commission-tracker/
├── apps/
│   ├── web/        # Next.js（Webアプリ）
│   └── mobile/      # Expo（モバイルアプリ）
├── packages/
│   ├── types/        # 共通型定義
│   ├── supabase/      # 共通Supabase操作関数
│   └── hooks/        # 共通Reactフック
├── turbo.json
└── pnpm-workspace.yaml
```

パッケージ管理は **pnpm** に統一しています。ルートで一括インストールできます。

```bash
# 以下、Linux環境で未実施の場合 
# ➀nvmをインストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# ②シェルを再読み込み
source ~/.bashrc
# ③Node.jsをインストール
nvm install --lts
# ④確認
which node

# pnpmをインストール
npm i -g pnpm
pnpm install
```

---

## 2. Supabase セットアップ

### 2-1. プロジェクト作成

[supabase.com](https://supabase.com) → **New project** でプロジェクトを作成します。

### 2-2. DB・RLS・Storage の構築

**supabase-migration-guide.md** を参照して、マイグレーションを実施してください。

### 2-3. 認証プロバイダーの設定

**Dashboard → Authentication → Providers** で以下を有効化します。

**Email**
- デフォルトで有効
- *Confirm email* はオフ推奨（開発中）

**Google**（Web版のみ対応・モバイル版は今後対応予定）
1. [Google Cloud Console](https://console.cloud.google.com) で OAuth アプリを作成
2. Client ID / Secret を Supabase の Google プロバイダー設定に入力
3. Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 2-4. URL Configuration

**Dashboard → Authentication → URL Configuration** で設定します。

| 項目          | 値                               |
| ------------- | -------------------------------- |
| Site URL      | `https://your-app.vercel.app`    |
| Redirect URLs | `https://your-app.vercel.app/**` |

### 2-5. API キーの確認

**Dashboard → Project Settings → Data API** で以下をメモしておきます。Web版・モバイル版で共通のSupabaseプロジェクトを使用します。

| 項目             | 環境変数名（Web）                | 環境変数名（モバイル）           |
| ---------------- | -------------------------------- | --------------------------------- |
| Project URL      | `NEXT_PUBLIC_SUPABASE_URL`       | `EXPO_PUBLIC_SUPABASE_URL`        |
| anon public key  | `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | `EXPO_PUBLIC_SUPABASE_ANON_KEY`   |
| service_role key | `SUPABASE_SERVICE_ROLE_KEY` ⚠️ 外部に漏らさないこと（Webのサーバーサイドのみ） |

---

## 3. Web版：ローカル動作確認

`vercel dev` を使うと、コミット・デプロイなしでローカルから本番 DB に接続してアプリを確認できます。

### 初回セットアップ（必要な場合に1 回だけ）

```bash
cd apps/web

# 1. Vercel CLI をインストール
npm i -g vercel

# 2. Vercel プロジェクトと紐付け（ブラウザでログイン・プロジェクト選択）
vercel link

# 3. 環境変数をローカルに取得（手入力不要）
vercel env pull .env.local
```

> ⚠️ `.env.local` には本番 DB の接続情報が含まれるため、**絶対にコミットしないでください。**

### 起動

```bash
# リポジトリルートから
pnpm dev:web

# または apps/web/ で直接
cd apps/web
vercel dev
```

`http://localhost:3000` でアプリが起動します。

---

## 4. Web版：Vercel デプロイ

1. GitHub にリポジトリを push する
2. [Vercel](https://vercel.com) → **Add New Project** → リポジトリを選択
3. **Settings → General → Root Directory** を `apps/web` に設定
4. **Environment Variables** に以下を追加してデプロイ

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
> ⚠️ Install Command は `pnpm install` に設定すること

---

## 5. モバイル版：ローカル動作確認

### 5-1. 環境変数の設定

`apps/mobile/.env.local` を作成し、Supabaseの接続情報を設定します。

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_URL=https://commission-tracker-nine.vercel.app
```

### 5-2. 依存パッケージのインストール

```bash
# リポジトリルートで一括インストール（pnpm統一済み）
pnpm install
```

### 5-3. 起動

```bash
# リポジトリルートから
pnpm dev:mobile

# または apps/mobile/ で直接
cd apps/mobile
npx expo start
```

起動後、ターミナルで以下を選択できます。

```
› Press w │ open web
› Press a │ open Android（Android Studioのエミュレータが必要）
› Press i │ open iOS simulator（Macが必要）
```

> Android Studio等でエラーが出る場合、npx expo start --tunnelで起動してみること。

### 5-4. 実機ネイティブ機能を使う場合（画像保存など）

`expo-media-library` など一部のネイティブ機能はExpo Goでは動作しないため、ネイティブビルドが必要です。

```bash
cd apps/mobile
npx expo run:android
```

初回はAndroidプロジェクトのビルドが走るため時間がかかります。

---

## 6. 外部サービス設定

### Resend（メール送信・Web版のみ）

アカウント削除申請の通知メール、お問い合わせフォームの管理者通知・ユーザー自動返信メールに使用します。

1. [resend.com](https://resend.com) でアカウント作成（無料・月 3,000 通まで）
2. **Dashboard → API Keys → Create API Key** で発行
3. 発行したキーを `RESEND_API_KEY` として Vercel に設定
4. `ADMIN_EMAIL` に受信先アドレスを設定

> 無料プランは `onboarding@resend.dev` からの送信のみ。独自ドメインで送信したい場合は DNS 設定が必要です。

### Stripe（サブスクリプション・Web版のみ）

月額課金（スタンダード・プレミアム）に使用します。

1. [stripe.com](https://stripe.com) でアカウント作成
2. **Products** でスタンダード（¥300/月）・プレミアム（¥800/月）の商品を作成
3. 各 Price ID を環境変数に設定
4. **Webhooks** に `https://your-app.vercel.app/api/stripe/webhook` を登録し、`checkout.session.completed` / `customer.subscription.deleted` イベントを有効化

> テストキー（`sk_test_`）と本番キー（`sk_live_`）を混在させないこと。モバイル版の課金対応は今後実装予定。

### Web Push（プッシュ通知・Web版のみ）

毎朝 8 時の納期リマインダー通知に使用します。

```bash
npx web-push generate-vapid-keys
```

生成された公開鍵・秘密鍵をそれぞれ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` に設定します。

> iOS でのプッシュ通知はホーム画面追加（PWA）が必須です（iOS 16.4 以降）。モバイル版（Expo）のプッシュ通知は今後実装予定。

---

## 7. 管理者設定

現在管理者ページはWeb版のみ対応しています。

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

## 8. 機能一覧

### Web版

**依頼管理**
- ✅ 依頼の登録・編集・削除
- ✅ ステータス管理（依頼済み / ラフ確認中 / 制作中 / 完成 / キャンセル）
- ✅ 納期 7 日前の警告表示
- ✅ ステータス・並び替えフィルタ

**画像**
- ✅ 依頼登録時に画像をまとめてアップロード
- ✅ ラフ・作業中・完成・その他の画像アップロード（Supabase Storage）
- ✅ 一覧カードにサムネイル表示（最初の 1 枚）
- ✅ 画像の拡大プレビュー・削除・ダウンロード（元画質保持）
- ✅ 詳細モーダルは表示・DLのみ、編集モーダルで追加・削除（更新ボタン押下で反映）
- ✅ プランごとの画像枚数制限

**認証・アカウント**
- ✅ メール / パスワード・Google ログイン
- ✅ パスワードリセット
- ✅ 表示名の設定
- ✅ アカウント削除申請
- ✅ ユーザーごとにデータが完全分離（RLS）

**通知**
- ✅ プッシュ通知（毎朝 8 時・納期 7 日以内）
- ✅ お知らせ・リリースノート（未読バッジ通知）
- ✅ お問い合わせフォーム

**課金**
- ✅ Stripe サブスク（月額課金・解約・カスタマーポータル）

**管理者**
- ✅ ユーザー一覧・プラン変更・ユーザー削除
- ✅ お知らせ管理／バージョン管理

**その他**
- ✅ デモモード
- ✅ PWA 対応
- ✅ LP・利用規約・プライバシーポリシー・特定商取引法ページ

### モバイル版（Android / iOS）

**依頼管理**
- ✅ 依頼の登録・編集・削除
- ✅ ステータス管理・フィルタ
- ✅ 納期 7 日前の警告表示
- ✅ 依頼一覧（サムネイル付きカード）
- ✅ 依頼詳細（下からスライドアップするモーダル）

**画像**
- ✅ 画像アップロード（ラフ・作業中・完成・その他）
- ✅ 一覧カードにサムネイル表示
- ✅ 画像プレビュー・ギャラリーへの保存
- ✅ 詳細モーダルは表示・プレビュー・DLのみ
- ✅ 編集画面で追加・削除（更新ボタン押下で反映・遅延削除方式）
- ✅ プランごとの画像枚数制限

**認証**
- ✅ メール / パスワード認証（ログイン・新規登録・パスワードリセット）
- 🔲 Google ログイン（未対応）

**今後実装予定**
- 🔲 プッシュ通知
- 🔲 お知らせ・バージョン情報
- 🔲 お問い合わせ
- 🔲 プラン・課金（Stripe）
- 🔲 管理者ページ

---

## 9. プラン制限

| プラン       | 月額 | 画像保存（アカウント合計） |
| ------------ | ---- | -------------------------- |
| 無料         | ¥0   | 10 枚まで                  |
| スタンダード | ¥300 | 50 枚まで                  |
| プレミアム   | ¥800 | 無制限                     |
