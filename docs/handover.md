# Commission Tracker 引き継ぎ資料

## サービス概要
絵の依頼を一元管理するWebアプリ。依頼する側・受ける側（絵師）両方をターゲットにしたSaaSサービス。

- **本番URL**: https://commission-tracker-nine.vercel.app
- **リポジトリ**: https://github.com/tinaRepo/CommissionTracker
- **ブランチ運用**: `main`（本番）/ `dev`（開発）

---

## 技術スタック

| 項目 | 内容 |
|------|------|
| フロントエンド | Next.js 14 (App Router) / React / TypeScript |
| バックエンド | Supabase（DB・認証・Storage） |
| ホスティング | Vercel |
| 決済 | Stripe（月額サブスク） |
| メール送信 | Resend |
| プッシュ通知 | Web Push API（web-push） |
| アナリティクス | Vercel Analytics |
| 広告 | Google AdSense（審査中） |

---

## ディレクトリ構成

```
app/
├── page.tsx                    # メインアプリ（CommissionApp）/ ログイン済み→アプリ、未ログイン→/login
├── login/page.tsx              # ログイン・新規登録・パスワードリセット・Googleログイン
├── lp/page.tsx                 # ランディングページ（/lp）
├── pricing/page.tsx            # プラン選択・Stripeチェックアウト
├── contact/page.tsx            # お問い合わせフォーム
├── guide/page.tsx              # 使い方ガイド
├── terms/page.tsx              # 利用規約
├── privacy/page.tsx            # プライバシーポリシー
├── tokusho/page.tsx            # 特定商取引法
├── version/page.tsx            # バージョン情報
├── update-password/page.tsx    # パスワード再設定
├── mgmt-c7f2a91e/page.tsx      # 管理者ページ（URLは推測されにくい形式）
├── auth/
│   ├── callback/
│   │   └── route.ts      # OAuth コールバック
│   ├── comfirm/
│        └── route.ts      # OAuth コールバック（パスワードリセット用）
├── api/
│   ├── stripe/
│   │   ├── checkout/route.ts   # Stripeチェックアウトセッション作成
│   │   ├── webhook/route.ts    # Stripe Webhook（決済完了・解約処理）
│   │   └── portal/route.ts    # Stripeカスタマーポータル
│   ├── push/
│   │   └── subscribe/route.ts  # プッシュ通知購読登録・解除
│   ├── cron/
│   │   └── deadline-notify/route.ts # 毎朝8時（UTC23時）の納期通知Cron
│   ├── admin/
│   │   └── delete-user/route.ts    # 管理者によるユーザー削除
│   ├── request-delete/route.ts     # ユーザーのアカウント削除申請
│   └── contact/route.ts            # お問い合わせメール送信

components/
├── CommissionApp.tsx           # メインアプリUI（一覧・フィルタ・ソート・カレンダー切替）
├── CommissionCalendar.tsx      # カレンダービュー（月表示・週表示）
├── DemoApp.tsx                 # デモモード（Supabase不使用・メモリのみ）
└── PushNotificationToggle.tsx  # プッシュ通知オン/オフトグル

lib/
└── supabase.ts                 # Supabaseクライアント・各種API関数

public/
├── sw.js                       # Service Worker（プッシュ通知受信）
├── manifest.json               # PWAマニフェスト
├── favicon.ico
├── apple-icon.png
├── icon0.svg
├── web-app-manifest-192x192.png
└── web-app-manifest-512x512.png

supabase/
├── schema.sql                  # テーブル定義
└── policy.sql                  # RLSポリシー・トリガー定義

vercel.json                     # Cron Job設定（毎日UTC23時=JST8時）
```

---

## 環境変数一覧

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # anon public key
SUPABASE_SERVICE_ROLE_KEY=          # service_role key（サーバーサイドのみ）

# Resend（メール送信）
RESEND_API_KEY=
ADMIN_EMAIL=                        # 管理者メールアドレス

# アプリURL
NEXT_PUBLIC_APP_URL=https://commission-tracker-nine.vercel.app

# Stripe（本番: sk_live_ / pk_live_）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STANDARD_PRICE_ID=          # サーバーサイド用
STRIPE_PREMIUM_PRICE_ID=           # サーバーサイド用
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=  # フロントエンド用
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=   # フロントエンド用

# Web Push（プッシュ通知）
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:xxx@example.com
CRON_SECRET=                        # Cron Job認証用シークレット
```

---

## Supabaseテーブル構成

### `user_profiles`
| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | auth.users参照 |
| plan | text | free / standard / premium |
| is_admin | boolean | 管理者フラグ |
| display_name | text | 表示名 |
| stripe_customer_id | text | StripeカスタマーID |
| stripe_subscription_id | text | サブスクリプションID |
| subscription_status | text | active / inactive |

### `commissions`
依頼情報。user_idでRLS分離。

### `commission_images`
画像情報。commission_idに紐づく。Storage: `commission-images` バケット。

### `push_subscriptions`
プッシュ通知の購読情報。1ユーザー1レコード。

---

## プラン設定

| プラン | 月額 | 画像上限 |
|--------|------|---------|
| 無料 | ¥0 | 10枚 |
| スタンダード | ¥300 | 50枚 |
| プレミアム | ¥800 | 無制限 |

---

## RLSポリシー（policy.sql参照）

重要：`user_profiles` のRLSは無限再帰を防ぐため `is_admin()` 関数を使用。

```sql
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid() and is_admin = true
  );
$$;
```

管理者設定方法：
```sql
update user_profiles set is_admin = true where id = 'UUID';
```

---

## 実装済み機能一覧

- ✅ メール/パスワード認証（ログイン・新規登録・パスワードリセット）
- ✅ Googleログイン
- ✅ 依頼の登録・編集・削除
- ✅ ステータス管理（5種類）
- ✅ 納期7日前アラート（アプリ内ハイライト）
- ✅ 画像アップロード（ラフ・作業中・完成・その他）
- ✅ プランごとの画像枚数制限
- ✅ 依頼一覧の並び替え・フィルタ
- ✅ カレンダービュー（月・週）
- ✅ 表示名設定
- ✅ プッシュ通知（毎朝8時・納期7日以内）
- ✅ Stripeサブスク（月額課金・解約・カスタマーポータル）
- ✅ 管理者ページ（プラン変更・ユーザー削除・名前検索）
- ✅ アカウント削除申請（Resendでメール通知）
- ✅ お問い合わせフォーム
- ✅ デモモード（ログイン不要・メモリのみ）
- ✅ PWA対応（ホーム画面追加）
- ✅ LP（/lp）
- ✅ 法的ページ（利用規約・プライバシー・特定商取引法）
- ✅ Google AdSense（審査中）

---

## バージョン履歴

| バージョン | 内容 |
|-----------|------|
| 1.0.0 | 正式リリース |
| 1.0.1 | タイムゾーン修正・ガイドページ更新・カレンダービュー追加 |
| 1.0.2 | 文字入力時の自動ズームインの抑制 |
| 1.0.3 | Google認証 |

---

## 注意事項

- `mgmt-c7f2a91e` が管理者ページのURL（推測されにくくするため）
- Service Role Keyは絶対にフロントエンドに露出させないこと
- Stripeのテストキー（`sk_test_`）と本番キー（`sk_live_`）を混在させないこと
- Cron Jobは本番環境（mainブランチ）のみ実行される
- iOSのプッシュ通知はホーム画面追加（PWA）必須・iOS 16.4以降

