# Commission Tracker 引き継ぎ資料

## サービス概要
絵の依頼を一元管理するWebアプリ。依頼する側・受ける側（絵師）両方をターゲットにしたSaaSサービス。

- **本番URL**: https://commission-tracker-nine.vercel.app
- **リポジトリ**: https://github.com/tinaRepo/CommissionTracker
- **ブランチ運用**: `main`（本番）/ `dev`（開発）

## 環境別URL設定（Supabase / Google OAuth）

| 環境          | Supabase Redirect URLs                                    | Supabase Site URL                           |
| ------------- | --------------------------------------------------------- | ------------------------------------------- |
| ローカル/検証 | https://commission-tracker-local.vercel.app/auth/callback | https://commission-tracker-local.vercel.app |

Google Cloud Console → 承認済みのリダイレクトURI：
```
https://endyhlszymdlxyrzdnwn.supabase.co/auth/v1/callback
```
詳細手順は `docs/google-login-setup.md` を参照。

---

## 技術スタック

| 項目           | 内容                                         |
| -------------- | -------------------------------------------- |
| フロントエンド | Next.js 14 (App Router) / React / TypeScript |
| バックエンド   | Supabase（DB・認証・Storage）                |
| ホスティング   | Vercel                                       |
| 決済           | Stripe（月額サブスク）                       |
| メール送信     | Resend                                       |
| プッシュ通知   | Web Push API（web-push）                     |
| アナリティクス | Vercel Analytics                             |
| 広告           | Google AdSense（審査中）                     |

---

## ディレクトリ構成

```
app/
├── page.tsx                    # メインアプリ（CommissionApp）/ ログイン済み→アプリ、未ログイン→/login
├── login/page.tsx              # ログイン・新規登録・パスワードリセット・Googleログイン
├── lp/page.tsx                 # ランディングページ（/lp）
├── pricing/page.tsx            # プラン選択・Stripeチェックアウト
├── guide/page.tsx              # 使い方ガイド
├── terms/page.tsx              # 利用規約
├── privacy/page.tsx            # プライバシーポリシー
├── tokusho/page.tsx            # 特定商取引法
├── update-password/page.tsx    # パスワード再設定
├── mgmt-c7f2a91e/
│   ├── notifications/page.tsx  # 管理者ページ（お知らせ・バージョン情報編集）
│   └── page.tsx                # 管理者ページ（URLは推測されにくい形式）
├── auth/
│   │   ├── last-login-provider/route.ts  # 直近ログインプロバイダーのDB保存・Cookie発行/取得
│   │   └── set-password/route.ts         # パスワード設定・変更（Admin API経由、email identityの正規リンク）
│   ├── callback/
│   │   └── route.ts      # OAuth コールバック
│   └─── comfirm/
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
├── DemoApp.tsx                 # デモモード（Supabase不使用・メモリのみ）
├── PageViewTracker.tsx         # Google Analytics（GA4）のページビュー計測用
├── PushNotificationToggle.tsx  # プッシュ通知オン/オフトグル
├── NotificationsModal.tsx      # お知らせ・リリースノート統合モーダル（ユーザー向け・✉️🔔共通）
├── ContactModal.tsx            # お問い合わせモーダル（メインアプリ・デモ・ログイン画面で共通利用）
└── AdminNotificationsPage.tsx  # 管理者向けお知らせ・バージョン管理画面

docs/
├── sql/xxx.sql                 # DML、DDL
└── handover.md                 # 引き継ぎ資料

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
| カラム                 | 型          | 説明                                                                        |
| ---------------------- | ----------- | --------------------------------------------------------------------------- |
| id                     | uuid        | auth.users参照                                                              |
| plan                   | text        | free / standard / premium                                                   |
| is_admin               | boolean     | 管理者フラグ                                                                |
| display_name           | text        | 表示名                                                                      |
| has_password           | boolean     | パスワード設定済みか（Google専用ユーザーの初期設定判定用）                  |
| last_login_provider    | text        | 直近ログインしたプロバイダー（email/google）                                |
| last_sign_in_at        | timestamptz | 最終ログイン日時（ログインのたびに`/api/auth/last-login-provider`から更新） |
| stripe_customer_id     | text        | StripeカスタマーID                                                          |
| stripe_subscription_id | text        | サブスクリプションID                                                        |
| subscription_status    | text        | active / inactive                                                           |

### `commissions`
依頼情報。user_idでRLS分離。

### `commission_images`
画像情報。commission_idに紐づく。Storage: `commission-images` バケット。

### `push_subscriptions`
プッシュ通知の購読情報。1ユーザー1レコード。

### `version_releases`
リリースバージョン情報。管理者のみ書き込み可、全ユーザー読み取り可。

| カラム      | 型          | 説明                     |
| ----------- | ----------- | ------------------------ |
| id          | uuid        | PK                       |
| version     | text        | バージョン番号（unique） |
| title       | text        | リリースタイトル         |
| released_at | date        | リリース日               |
| created_at  | timestamptz | 作成日時                 |

### `version_release_items`
更新内容の明細。1バージョンに対して複数登録可。

| カラム     | 型          | 説明                 |
| ---------- | ----------- | -------------------- |
| id         | uuid        | PK                   |
| release_id | uuid        | version_releases参照 |
| category   | text        | 新機能 / 改善 / 修正 |
| content    | text        | 更新内容テキスト     |
| sort_order | integer     | 表示順               |
| created_at | timestamptz | 作成日時             |

### `announcements`
ユーザー向けお知らせ。管理者のみ書き込み可、全ユーザー読み取り可。

| カラム       | 型          | 説明                                              |
| ------------ | ----------- | ------------------------------------------------- |
| id           | uuid        | PK                                                |
| title        | text        | タイトル                                          |
| content      | text        | 本文                                              |
| type         | text        | お知らせ / メンテナンス / 障害情報 / キャンペーン |
| published_at | timestamptz | 公開日時                                          |
| created_at   | timestamptz | 作成日時                                          |
| updated_at   | timestamptz | 更新日時                                          |

### `user_notification_status`
お知らせの既読管理。ユーザーが開いた時に is_read=true に更新。

| カラム          | 型          | 説明                        |
| --------------- | ----------- | --------------------------- |
| user_id         | uuid        | auth.users参照（PK複合）    |
| announcement_id | uuid        | announcements参照（PK複合） |
| is_read         | boolean     | 既読フラグ                  |
| created_at      | timestamptz | 作成日時                    |

### `user_settings`
ユーザーごとの設定。バージョン未読管理などを担う。

| カラム               | 型          | 説明                     |
| -------------------- | ----------- | ------------------------ |
| user_id              | uuid        | auth.users参照（PK）     |
| last_seen_release_id | uuid        | 最後に確認したリリースID |
| created_at           | timestamptz | 作成日時                 |
| updated_at           | timestamptz | 更新日時                 |

---

## プラン設定

| プラン       | 月額 | 画像上限 |
| ------------ | ---- | -------- |
| 無料         | ¥0   | 10枚     |
| スタンダード | ¥300 | 50枚     |
| プレミアム   | ¥800 | 無制限   |

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
- ✅ 依頼登録時に画像をまとめてアップロード（新規登録フォームから追加可能）
- ✅ 画像アップロード（ラフ・作業中・完成・その他）
- ✅ 一覧カードにサムネイル表示（最初の1枚・Signed URL遅延取得）
- ✅ 画像の拡大プレビュー・削除・ダウンロード（元画質保持・blob download）
- ✅ プランごとの画像枚数制限
- ✅ 依頼一覧の並び替え・フィルタ
- ✅ 表示名設定
- ✅ プッシュ通知（毎朝8時・納期7日以内）
- ✅ Stripeサブスク（月額課金・解約・カスタマーポータル）
- ✅ 管理者ページ（プラン変更・ユーザー削除・名前検索）
- ✅ 管理者：お知らせ管理（登録・編集・削除）
- ✅ 管理者：バージョン管理（登録・編集・削除・更新内容管理）
- ✅ アカウント削除申請（Resendでメール通知）
- ✅ お問い合わせフォーム（モーダル表示・管理者通知メール・ユーザー自動返信）
- ✅ デモモード（ログイン不要・メモリのみ・✉️🔔ボタン付き）
- ✅ PWA対応（ホーム画面追加）
- ✅ LP（/lp）
- ✅ 法的ページ（利用規約・プライバシー・特定商取引法）
- ✅ Google AdSense（審査中）
- ✅ お知らせ・リリースノート統合管理（DB管理・タブ切替・未読バッジ通知）
- ✅ お知らせ・バージョン管理モーダル（ベルマーク押下でモーダル表示、既読管理）
- ✅ 全モーダル固定サイズ統一・iOS Safari対応（背景スクロールロック）
- ✅ ユーザーメニューのテキスト折り返し防止
- ✅ Googleアカウントとの連携・解除（メール登録ユーザー向け、`linkIdentity`/`unlinkIdentity`）
- ✅ 連携解除時・ログアウト時、パスワード未設定かつGoogle未連携の場合の警告表示

---

## モーダル設計方針

全モーダル共通で以下の設計を採用。

```
height: calc(100vh - 32px)   // オーバーレイの padding 16px × 2 を引いた値
maxHeight: 600               // PC では最大 600px に収める
display: flex
flexDirection: column
```

内部構造：
- **タイトルエリア**（`flexShrink: 0` で固定）
- **コンテンツエリア**（`flex: 1` + `overflowY: auto` でスクロール）
- **ボタンエリア**（`flexShrink: 0` で固定）

オーバーレイには `overscrollBehavior: contain` + `touchAction: none` を設定し、iOS Safariで背景がスクロールする問題を防止。

---

## バージョン履歴

| バージョン | 内容                                                     |
| ---------- | -------------------------------------------------------- |
| 1.0.0      | 正式リリース                                             |
| 1.0.1      | タイムゾーン修正・ガイドページ更新・カレンダービュー追加 |
| 1.0.2      | 文字入力時の自動ズームインの抑制                         |
| 1.0.3      | Google認証                                               |
| 1.1.0      | お知らせ・リリースノート統合管理・未読バッジ通知         |

---

## 注意事項

- `mgmt-c7f2a91e` が管理者ページのURL（推測されにくくするため）
- 管理者のお知らせ・バージョン管理は `/mgmt-c7f2a91e/notifications`
- `ContactModal` は CommissionApp・DemoApp・ログイン画面の3箇所で共通利用
- Resend 無料プランは `onboarding@resend.dev` からの送信のみ。独自ドメイン設定後は `route.ts` の `from` を変更すること
- Service Role Keyは絶対にフロントエンドに露出させないこと
- Stripeのテストキー（`sk_test_`）と本番キー（`sk_live_`）を混在させないこと
- Cron Jobは本番環境（mainブランチ）のみ実行される
- iOSのプッシュ通知はホーム画面追加（PWA）必須・iOS 16.4以降
- モーダル内の `autoFocus` は全コンポーネントで削除済み（iOS Safariでキーボードが即時展開されるのを防止）
- 一覧カードのサムネイルはSignedUrl遅延取得方式のため、初回表示時に一覧全体が重くなることはない
- パスワード設定・変更、直近ログインプロバイダー判定はSupabaseの`user.identities`を利用しており、テーブル追加・マイグレーションは不要
- 直近ログインプロバイダーは `user_profiles.last_login_provider` をDBの正としつつ、
  未認証のログイン画面向けにはHttpOnly Cookie（`ct_last_login_provider`）経由でのみ提供する。
  localStorageや通常のJS読み取り可能なCookieは使用しない（XSS時の詐称・漏えいリスク低減のため）。
- Google専用で登録したユーザーがパスワードログインを追加する場合、
  Admin API（`admin.updateUserById`）や通常の`updateUser({password})`では
  `auth.identities`にemail identityが正規にリンクされない
  （Admin API経由はさらにセッション無効化を伴いログアウトされる場合がある）。
  そのため、既存のパスワードリセット導線
  （`resetPasswordForEmail` → `/auth/confirm` → `/update-password`）を再利用し、
  正規のリカバリーセッション上で`updateUser({password})`を実行する方式に統一する。
  この際、Supabase Dashboardの「Automatic Linking」設定が有効であることが前提となる。
- 既にパスワードを持つユーザーのパスワード変更は、識別子の追加が不要なため
  通常の`signInWithPassword`による再認証＋`updateUser({password})`で完結する。
- パスワードリセットメールのリンクはPKCEフロー（`code`パラメータ）で返ってくるため、
  `auth/confirm/route.ts`は`token_hash`+`type`（従来型）と`code`（PKCE）の両方に対応する。
  片方だけの対応だと、既存セッションがある状態（Googleログイン中にパスワード設定を試みた場合等）で
  サイレントに処理が失敗し、何も起きていないのにアプリ画面に戻ってしまうため注意。
- Googleのみで登録し、かつパスワード未設定のユーザーはidentitiesが1件のみのため、
  `unlinkIdentity()`は仕様上必ず失敗する（Supabaseの安全装置）。このケースでは
  「解除を試みて失敗させる」のではなく、UI側で「パスワード設定」または
  「アカウント削除申請」に誘導する。削除申請が承認されアカウントが削除されれば、
  identitiesごと削除されるため、実質的に連携解除と同じ結果になる。
- Supabaseの`resetPasswordForEmail`・`linkIdentity`・`signInWithOAuth`など、`redirectTo`を
  指定するAPIを新たに使う際は、そのURLを必ずSupabase Dashboard → Authentication →
  URL Configuration → Redirect URLsに事前登録すること。未登録の場合、GoTrueは
  エラーを出さず黙ってSite URLへフォールバックし、認証トークンがハッシュフラグメントとして
  付与されるため、supabase-jsが意図せず自動ログインしてしまう（詳細: docs/google-login-setup.md）。
- 新規ユーザー作成トリガー（`handle_new_user`）は、`display_name`の初期値も設定する。
  メール登録は`signUp`の`options.data.display_name`（フォーム必須項目）から、
  Google登録は`raw_user_meta_data`の`full_name`/`name`から取得する。
  これにより、Google登録ユーザーも管理者画面で最初から表示名が見える。
- `last_sign_in_at`はログイン成功のたびに`/api/auth/last-login-provider`のPOSTで更新される。
  ログイン処理そのものとは独立した「補助的な記録」のため、更新に失敗してもログイン自体は成功する。