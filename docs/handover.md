# Commission Tracker 引き継ぎ資料

## サービス概要
絵の依頼を一元管理するアプリ。依頼する側・受ける側（絵師）両方をターゲットにしたSaaSサービス。
Web（Next.js）に加え、React Native（Expo）によるモバイルアプリ（Android/iOS）対応を進めている。

- **本番URL**: https://commission-tracker-nine.vercel.app
- **リポジトリ**: https://github.com/tinaRepo/CommissionTracker
- **ブランチ運用**: `main`（本番）/ `dev`（開発）

---

## 技術スタック

| 項目              | 内容                                         |
| ----------------- | -------------------------------------------- |
| Webフロントエンド | Next.js 14 (App Router) / React / TypeScript |
| モバイル          | Expo / React Native / Expo Router            |
| バックエンド      | Supabase（DB・認証・Storage）                |
| ホスティング      | Vercel（Web）                                |
| パッケージ管理    | pnpm（モノレポ全体・Turborepo）              |
| 決済              | Stripe（月額サブスク・Web版のみ）            |
| メール送信        | Resend                                       |
| プッシュ通知      | Web Push API（web-push）/ Web版のみ          |
| アナリティクス    | Vercel Analytics                             |
| 広告              | Google AdSense（審査中・Web版のみ）          |

---

## ディレクトリ構成

```
commission-tracker/              # リポジトリルート
├── apps/
│   ├── web/                     # Next.js 14（Webアプリ）
│   │   ├── app/
│   │   │   ├── page.tsx                    # メインアプリ（CommissionApp）
│   │   │   ├── login/page.tsx              # ログイン・新規登録等
│   │   │   ├── lp/page.tsx                 # ランディングページ
│   │   │   ├── pricing/page.tsx            # プラン選択
│   │   │   ├── guide/page.tsx              # 使い方ガイド
│   │   │   ├── terms/page.tsx              # 利用規約
│   │   │   ├── privacy/page.tsx            # プライバシーポリシー
│   │   │   ├── tokusho/page.tsx            # 特定商取引法
│   │   │   ├── update-password/page.tsx    # パスワード再設定
│   │   │   ├── mgmt-c7f2a91e/
│   │   │   │   ├── notifications/page.tsx  # 管理者：お知らせ・バージョン管理
│   │   │   │   └── page.tsx                # 管理者ページ
│   │   │   ├── auth/
│   │   │   │   ├── callback/route.ts       # OAuthコールバック
│   │   │   │   └── comfirm/route.ts        # パスワードリセット用コールバック
│   │   │   └── api/
│   │   │       ├── stripe/
│   │   │       │   ├── checkout/route.ts   # Stripeチェックアウトセッション作成
│   │   │       │   ├── webhook/route.ts    # Stripe Webhook（決済完了・解約処理）
│   │   │       │   └── portal/route.ts     # Stripeカスタマーポータル
│   │   │       ├── push/subscribe/route.ts          # プッシュ通知購読登録・解除
│   │   │       ├── cron/deadline-notify/route.ts    # 毎朝8時（UTC23時）の納期通知Cron
│   │   │       ├── admin/delete-user/route.ts       # 管理者によるユーザー削除
│   │   │       ├── request-delete/route.ts          # ユーザーのアカウント削除申請
│   │   │       └── contact/route.ts                 # お問い合わせメール送信
│   │   ├── components/
│   │   │   ├── CommissionApp.tsx           # メインアプリUI（一覧・フィルタ・ソート・画像管理）
│   │   │   ├── DemoApp.tsx                 # デモモード（Supabase不使用・メモリのみ）
│   │   │   ├── PageViewTracker.tsx         # Google Analytics（GA4）のページビュー計測用
│   │   │   ├── PushNotificationToggle.tsx  # プッシュ通知オン/オフトグル
│   │   │   ├── NotificationsModal.tsx      # お知らせ・リリースノート統合モーダル
│   │   │   ├── ContactModal.tsx            # お問い合わせモーダル（共通利用）
│   │   │   └── AdminNotificationsPage.tsx  # 管理者向けお知らせ・バージョン管理画面
│   │   ├── lib/
│   │   │   └── supabase.ts                 # sharedSupabaseインスタンスのみ（型・関数はpackages/に移行済み）
│   │   ├── public/
│   │   │   ├── sw.js                       # Service Worker（プッシュ通知受信）
│   │   │   ├── manifest.json               # PWAマニフェスト
│   │   │   └── ...
│   │   ├── vercel.json                     # Cron Job設定
│   │   ├── next.config.* / tailwind.config.* / tsconfig.json
│   │
│   └── mobile/                  # Expo（モバイルアプリ・pnpm統一済み）
│       ├── app/
│       │   ├── _layout.tsx                 # ルートレイアウト（Expo Router）
│       │   ├── index.tsx                   # ログイン・新規登録・パスワードリセット
│       │   ├── home.tsx                    # 依頼一覧（サムネイル・フィルタ・統計）
│       │   └── commission/
│       │       ├── _layout.tsx             # commission配下のStack設定
│       │       ├── [id].tsx                # 依頼詳細（画面遷移版・現在は未使用気味）
│       │       ├── new.tsx                 # 新規登録（画像追加可）
│       │       └── edit/[id].tsx           # 編集（画像追加・削除可）
│       ├── components/
│       │   ├── CommissionDetailModal.tsx   # 依頼詳細モーダル（一覧から呼び出し・readonly）
│       │   ├── ImageSection.tsx            # 画像表示・追加・削除共通コンポーネント
│       │   └── DatePickerField.tsx         # 日付選択（react-native-modal-datetime-picker）
│       ├── lib/
│       │   └── supabase.ts                 # @commission-tracker/supabase/native のクライアントを使用
│       ├── android/                        # expo run:android 用ネイティブプロジェクト
│       └── app.json / package.json（pnpm workspace対象）
│
├── packages/                    # Web・モバイル共通ロジック（pnpm workspace）
│   ├── types/
│   │   └── src/
│   │       ├── commission.ts    # Commission, CommissionStatus, ImageType等
│   │       ├── user.ts          # UserProfile, Plan, PLAN_LIMITS等
│   │       ├── notification.ts  # Announcement, VersionRelease等
│   │       └── index.ts
│   ├── supabase/
│   │   └── src/
│   │       ├── client.ts        # Web用：createBrowserClient（@supabase/ssr）
│   │       ├── client.native.ts # モバイル用：createClient（@supabase/supabase-js）
│   │       ├── user.ts          # fetchMyProfile, adminFetchAllUsers等
│   │       ├── commissions.ts   # fetchCommissions, createCommission等
│   │       ├── images.ts        # uploadImage, deleteImage, getSignedImageUrl等
│   │       └── index.ts
│   │       # package.json exports: "." → index.ts, "./native" → client.native.ts
│   └── hooks/
│       └── src/
│           ├── useAuth.ts
│           ├── useCommissions.ts   # reload(showLoading?)でローディング表示を制御可能
│           ├── useImages.ts
│           ├── useUnreadCount.ts
│           └── index.ts
│
├── docs/                        # 引き継ぎ資料一式（リポジトリルート直下）
│   ├── sql/xxx.sql
│   ├── handover.md               # 本ファイル
│   ├── README.md
│   └── migration-notes.md        # Vercel等の本番適用手順メモ
│
├── turbo.json
├── pnpm-workspace.yaml           # apps/*, packages/*（apps/mobileもpnpm統一済み）
└── package.json                 # ルート（turbo用）
```

---

## 環境変数一覧

### apps/web/.env.local

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

### apps/mobile/.env.local

```bash
EXPO_PUBLIC_SUPABASE_URL=           # Webと同じSupabase Project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=      # Webと同じanon public key
EXPO_PUBLIC_APP_URL=https://commission-tracker-nine.vercel.app
```

---

## Supabaseテーブル構成

### `user_profiles`
| カラム                 | 型      | 説明                      |
| ---------------------- | ------- | ------------------------- |
| id                     | uuid    | auth.users参照            |
| plan                   | text    | free / standard / premium |
| is_admin               | boolean | 管理者フラグ              |
| display_name           | text    | 表示名                    |
| stripe_customer_id     | text    | StripeカスタマーID        |
| stripe_subscription_id | text    | サブスクリプションID      |
| subscription_status    | text    | active / inactive         |

### `commissions`
依頼情報。user_idでRLS分離。
- `status`: pending / rough / progress / done / cancelled

### `commission_images`
画像情報。commission_idに紐づく。Storage: `commission-images` バケット。
- `image_type`: rough / wip / finished / other

### `push_subscriptions`
プッシュ通知の購読情報。1ユーザー1レコード（Web版のみ利用）。

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

### Web版

- ✅ メール/パスワード認証（ログイン・新規登録・パスワードリセット）
- ✅ Googleログイン
- ✅ 依頼の登録・編集・削除
- ✅ ステータス管理（5種類）
- ✅ 納期7日前アラート（アプリ内ハイライト）
- ✅ 依頼登録時に画像をまとめてアップロード
- ✅ 画像アップロード（ラフ・作業中・完成・その他）
- ✅ 一覧カードにサムネイル表示（最初の1枚・Signed URL遅延取得）
- ✅ 画像の拡大プレビュー・削除・ダウンロード（元画質保持・blob download）
- ✅ 詳細モーダルは画像表示・DLのみ（追加・削除不可）
- ✅ 編集モーダルで画像の追加・削除が可能（「更新する」ボタン押下時にDB反映・遅延削除方式）
- ✅ プランごとの画像枚数制限
- ✅ 依頼一覧の並び替え・フィルタ
- ✅ 表示名設定
- ✅ プッシュ通知（毎朝8時・納期7日以内）
- ✅ Stripeサブスク（月額課金・解約・カスタマーポータル）
- ✅ 管理者ページ（プラン変更・ユーザー削除・名前検索）
- ✅ 管理者：お知らせ管理／バージョン管理
- ✅ アカウント削除申請（Resendでメール通知）
- ✅ お問い合わせフォーム
- ✅ デモモード
- ✅ PWA対応
- ✅ LP・法的ページ
- ✅ Google AdSense（審査中）
- ✅ お知らせ・リリースノート統合管理（未読バッジ通知）

### モバイル版（Expo / Android・iOS）

- ✅ メール/パスワード認証（ログイン・新規登録・パスワードリセット）
- ✅ 依頼の登録・編集・削除
- ✅ ステータス管理（5種類・フィルタ可）
- ✅ 納期7日前アラート
- ✅ 一覧カードにサムネイル表示（72×72固定・角丸統一・Signed URL遅延取得）
- ✅ 依頼詳細：下からスライドアップするモーダル形式
- ✅ 詳細モーダルは画像表示・プレビュー・DLのみ（追加・削除不可）
- ✅ 編集画面で画像の追加・削除が可能（「更新する」ボタン押下時にDB反映・遅延削除方式）
- ✅ 画像プレビュー・ギャラリーへのDL（expo-media-library使用）
- ✅ プランごとの画像枚数制限
- ✅ 日付選択：カレンダーUI（react-native-modal-datetime-picker・日本語対応）
- 🔲 Google認証
- 🔲 プッシュ通知
- 🔲 お知らせ・バージョン情報
- 🔲 お問い合わせ
- 🔲 プラン・課金（Stripe）
- 🔲 管理者ページ

---

## Web版：モーダル設計方針

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

## モバイル版：画像管理の仕様

| 画面                     | 画像の操作               | DB反映タイミング                         |
| ------------------------ | ------------------------ | ---------------------------------------- |
| 詳細モーダル（一覧から） | 表示・プレビュー・DLのみ | -                                        |
| 新規登録画面             | 追加のみ（削除可）       | 「登録する」ボタン押下時                 |
| 編集画面                 | 追加・削除両方可能       | 「更新する」ボタン押下時（遅延削除方式） |

削除は即時実行せず、`pendingDeletes` に保持し「更新する」ボタン押下時にまとめてDB削除する。削除予定の画像は半透明＋「削除予定」表示になり、再タップで取り消し可能。

### モバイル版：Modalネストの注意点
React Native（Android）では `Modal` コンポーネントを別の `Modal` の中にネストすると `addViewAt` エラーが発生する。
画像プレビューのModalは `CommissionDetailModal` 内ではなく**同階層の兄弟コンポーネント**として配置すること（`<>...</>` フラグメントで分離）。

---

## バージョン履歴

| バージョン | 内容                                                                |
| ---------- | ------------------------------------------------------------------- |
| 1.0.0      | 正式リリース                                                        |
| 1.0.1      | タイムゾーン修正・ガイドページ更新・カレンダービュー追加            |
| 1.0.2      | 文字入力時の自動ズームインの抑制                                    |
| 1.0.3      | Google認証                                                          |
| 1.1.0      | お知らせ・リリースノート統合管理・未読バッジ通知                    |
| 2.0.0      | モノレポ移行（Turborepo + pnpm）・packages/共通化                   |
| 2.1.0      | モバイル版（Expo）：認証・依頼CRUD・画像管理 実装                   |
| 2.2.0      | モバイル版をnpm独立構成からpnpm統一に移行・docsをルート直下に再配置 |

---

## 注意事項

- `mgmt-c7f2a91e` が管理者ページのURL（推測されにくくするため）
- 管理者のお知らせ・バージョン管理は `/mgmt-c7f2a91e/notifications`
- `ContactModal` は CommissionApp・DemoApp・ログイン画面の3箇所で共通利用（Web版のみ）
- Resend 無料プランは `onboarding@resend.dev` からの送信のみ。独自ドメイン設定後は `route.ts` の `from` を変更すること
- Service Role Keyは絶対にフロントエンドに露出させないこと
- Stripeのテストキー（`sk_test_`）と本番キー（`sk_live_`）を混在させないこと
- Cron Jobは本番環境（mainブランチ）のみ実行される
- iOSのプッシュ通知（Web版PWA）はホーム画面追加必須・iOS 16.4以降
- 一覧カードのサムネイルはSignedUrl遅延取得方式のため、初回表示時に一覧全体が重くなることはない
- `apps/mobile/` は `@commission-tracker/supabase/native`（`@supabase/supabase-js` を直接使用）を利用。Web版の `@commission-tracker/supabase`（`@supabase/ssr` の `createBrowserClient`）とはエントリポイントで分岐している
- `apps/mobile/` の画像アップロードは `expo-file-system/legacy` の base64読み込み＋Uint8Array変換で行う（`fetch().blob()` やFormDataはReact Native環境で利用不可）
- `apps/mobile/` のDLは `expo-media-library/legacy` を使用（新API・`expo-media-library`単体はExpo Go非対応のため `npx expo run:android` でのネイティブビルドが必要）
