# ツクリスト 引き継ぎ資料

> 旧名称: Commission Tracker（絵師向け依頼管理）。v2.0.0で汎用納期管理サービス「ツクリスト」に改称。
> 用語・DB名称の変更詳細は [rebrand-plan.md](./rebrand-plan.md) を参照。

## サービス概要

依頼・タスクの納期、金額、確認用画像をまとめて管理するWebアプリ。
イラスト依頼に限らず、外注・制作物の依頼全般（デザイン・動画・執筆・開発など）で利用できる。
用語は「作り手」（依頼を受ける側）と「依頼する側」で統一する。

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
├── layout.tsx                  # 全体layout、共通metadata、AdSense/GAタグ
├── globals.css                 # デザイントークン（DESIGN.md準拠）とベーススタイル
├── components.css              # 共通コンポーネントクラス
├── page.tsx                    # メインアプリ（TaskApp、検索エンジン対象外）
├── sitemap.ts
├── not-found.tsx / error.tsx / global-error.tsx
├── login/                      # ログイン・新規登録・パスワードリセット・Googleログイン
├── lp/                         # ランディングページ
├── pricing/                    # プラン表示・Stripeチェックアウト
├── guide/ terms/ privacy/ tokusho/
├── update-password/            # パスワード設定・再設定
├── maintenance/                # メンテナンス中の利用者向け画面
├── forbidden/                  # 管理者権限がない場合の案内
├── mgmt-c7f2a91e/              # 管理者ページ（URLは推測されにくい形式）
│   ├── page.tsx                # ユーザー・プラン・メンテナンス管理
│   └── notifications/page.tsx  # お知らせ・バージョン情報編集
├── auth/
│   ├── callback/route.ts       # OAuthコールバック
│   └── confirm/route.ts        # パスワード設定・リセットリンクの検証
└── api/
    ├── stripe/{checkout,webhook,portal}/route.ts
    ├── push/subscribe/route.ts
    ├── pwa-prompt/route.ts
    ├── cron/deadline-notify/route.ts   # 毎時0分の納期通知Cron（通知時刻が一致するユーザーにだけ送信・Bearer認証）
    ├── health/route.ts                 # 死活監視（?deep=1 でCron最終成功時刻まで確認）
    ├── account/delete/route.ts         # 本人によるアカウント即時削除
    ├── admin/{delete-user,notify-push}/route.ts
    ├── auth/last-login-provider/route.ts
    ├── request-delete/route.ts
    └── contact/route.ts

components/
├── TaskApp.tsx                 # メインアプリUI（旧 CommissionApp.tsx）
├── DemoApp.tsx                 # デモモード（Supabase不使用・メモリのみ）
├── TaskShared.tsx              # TaskApp/DemoApp共通の定数・フォーマッタ・UI部品
│                                # （STATUSES/IMAGE_TYPES/fmtDate/fmtShortDate/fmtPrice/daysUntil/
│                                #   Field/DateField/DateRangeField/StatusBadge/TaskListCard/Icon）
├── TaskSearchBar.tsx           # 共通検索バー（旧 CommissionSearchBar.tsx）
├── PageViewTracker.tsx
├── PushNotificationToggle.tsx   # 端末ごとの通知オン/オフ
├── TaskCalendar.tsx            # カレンダービュー（月・週）
├── TagPicker.tsx               # タグ選択UIとタグ管理モーダル
├── NotifySettingsModal.tsx     # 通知時刻の設定
├── DeleteAccountModal.tsx      # 本人によるアカウント削除
├── AdSenseLoader.tsx           # AdSenseを公開ページだけで読み込む
├── InstallPromptBanner.tsx
├── SystemMessage.tsx
├── NotificationsModal.tsx
├── ContactModal.tsx
└── AdminNotificationsPage.tsx

hooks/
├── useNotifications.ts         # お知らせ・リリースノートの取得＋未読管理
├── useTaskSearch.ts            # 検索・フィルタ・並び替え（旧 useCommissionSearch.ts）
└── useInstallPrompt.ts

docs/
├── google-login-setup.md / handover.md / rebrand-plan.md
├── seo-and-ads.md / supabase-migration-guide.md / update-notes.md

lib/
├── seo.ts
├── supabase.ts                 # Supabaseクライアント・型（Task/Tag/TaskInput等）・API関数
├── calendar.ts                 # カレンダーの日付計算（純粋関数）
└── server/                     # サーバー専用（APIルートから使う）
    ├── admin.ts                #   service_roleクライアント・認証・レート制限・Cron認証
    ├── monitor.ts              #   管理者アラートメール・job_runs記録・Healthchecks通知
    └── delete-account.ts       #   アカウント完全削除（Stripe解約→画像削除→auth削除）

scripts/
└── migrate-storage.mjs         # commission-images → task-images のStorage移行（冪等・--dry-run / --cleanup）

public/                         # ads.txt, manifest.json, sw.js, offline.html, アイコン類, robots.txt

supabase/migrations/
├── ...（既存）
├── 20260927000000_V1.2.0_announcements_targeting.sql
├── 20260927000001_V1.2.0_add_maintenance_mode.sql
├── 20260928000000_V2.0.0_rebrand_to_tasks.sql   # commissions→tasks 等の名称変更
├── 20261005000000_V2.0.1_hardening.sql          # 特権カラム保護・画像枚数トリガー・レート制限・複数端末通知
└── 20261006000000_V2.1.0_features.sql           # タグ・通知時刻・監視テーブル・Stripe冪等・search_path・RLS/インデックス

DESIGN.md                       # デザインシステム定義（Apple系）。globals.css/components.cssの元になる
.env.example                    # 環境変数の雛形（CRON_SECRETの生成・登録方法をコメントで記載）
vercel.json                     # Cron Job設定（毎時0分＝要Vercel Pro。シークレットはURLに書かない）
.github/workflows/ci.yml        # CI（typecheck / lint / build）
middleware.ts                   # メンテナンスモード時の全画面/API制御（anonキー・10秒キャッシュ・静的ファイルはmatcherで除外）
```

### v2.0.0で削除するファイル（新名称へ置換済み）

- `components/CommissionApp.tsx` → `TaskApp.tsx`
- `components/CommissionShared.tsx` → `TaskShared.tsx`
- `components/CommissionSearchBar.tsx` → `TaskSearchBar.tsx`
- `hooks/useCommissionSearch.ts` → `useTaskSearch.ts`

なお旧`CommissionShared.tsx`にあった`CommissionCard`（縦長の詳細カード）は
どこからも参照されていなかったため、`TaskShared.tsx`には引き継いでいない。

---

## 環境変数一覧

雛形は `.env.example`。

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # サーバーサイドのみ

# Resend
RESEND_API_KEY=
ADMIN_EMAIL=

# アプリURL（ドメイン確定後に実URLへ。例: https://commission-tracker-nine.vercel.app）
# パスは付けない（プッシュ通知のリンク先・メール内リンクに使われる）
NEXT_PUBLIC_APP_URL=

# Stripe（本番: sk_live_ / pk_live_）
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
VAPID_EMAIL=mailto:xxx@example.com

# Cron（16文字以上。自分で生成する。下記「Cron Jobの認証」参照）
CRON_SECRET=

# 監視（任意）: Healthchecks.io 等のping URL。Cron成功のたびにpingし、途切れると通知される
HEALTHCHECKS_PING_URL=
```

---

## Cron Job の認証（CRON_SECRET）

`vercel.json` の Cron（**毎時0分**・Vercel Pro 以上）が `GET /api/cron/deadline-notify` を呼び出す。
納期7日以内の未完了タスクを持つユーザーのうち、**通知時刻（`user_settings.notify_hour`・JST・既定8）が現在の時と一致する人**へ、
全端末にWeb Pushを送る。

- 同じ日に同じユーザーへ重複送信しない（`notification_log`）。1000件超のタスクもページングで取得。
- 送信は並列10・50秒の時間予算（`maxDuration = 60`）。超過分は打ち切って `truncated` として記録・通知する。
- 実行結果は `job_runs` に記録。失敗率50%以上・全滅・打ち切り・異常終了のときは管理者へメール（同種は1時間に1通）＋Healthchecksへ失敗通知。
- JST 3時台の実行で、古い記録（`notification_log`・`job_runs`90日・`stripe_events`30日）を削除する。
- Hobbyプランでは毎時Cronを使えない。その場合は Supabase の `pg_cron` + `pg_net` から毎時このURLをBearer付きで呼ぶ。

- ルートは **`Authorization: Bearer <CRON_SECRET>` を定数時間比較で検証**し、不一致は理由を返さず401。
  `CRON_SECRET` が未設定・16文字未満の場合は常に拒否する（fail closed）。500系も詳細はログのみで、レスポンスは固定文言。
- **URLのクエリ（`?secret=...`）による認証は廃止した**。クエリはリポジトリ・ログ・履歴に残るため。
- Vercel Cron は、プロジェクトに環境変数 `CRON_SECRET` が設定されていれば、上記ヘッダーを自動で付与して呼び出す
  （`vercel.json` 側に認証情報を書く必要はない）。Cron は Production デプロイでのみ実行される。

### CRON_SECRET の発行・登録手順

外部サービスが発行するものではなく、自分で生成する。

```bash
openssl rand -hex 32
# opensslが無ければ
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

1. **Vercel Dashboard → Project → Settings → Environment Variables** に `CRON_SECRET` を追加（Production）
2. **Redeploy**（環境変数の変更は再デプロイしないと反映されない）
3. ローカル用は `vercel env pull .env.local`、または `.env.local` に同じ値を記述

### 確認

```bash
# ヘッダーなし → 401（通知は送られない）
curl -i https://<本番ドメイン>/api/cron/deadline-notify
```

正しいヘッダー付きで呼ぶと実際に通知が送られる。手動実行は Vercel Dashboard → Project → Settings → Cron Jobs の
「Run」で行うか、検証環境で行うこと。

### ローテーション（過去のシークレットが漏れている場合）

旧 `vercel.json` には `?secret=...` が平文でコミットされていた。**旧値は無効化（再発行）すること**。
新しい値を生成して Vercel に登録・Redeploy すれば、旧値は使えなくなる。Gitの履歴に残った旧値は、
ローテーション後は無害になる。

> メンテナンスモード中は `middleware.ts` が `/api/*` を 503 で返すため、Cronも通知を送れない（意図した挙動）。
> メンテ中も通知したい場合のみ、`allowedDuringMaintenance` に `/api/cron/` を追加する（認証はルート側で行われる）。

---

## Supabaseテーブル構成

### `user_profiles`
| カラム                 | 型          | 説明                                         |
| ---------------------- | ----------- | -------------------------------------------- |
| id                     | uuid        | auth.users参照                               |
| plan                   | text        | free / standard / premium                    |
| is_admin               | boolean     | 管理者フラグ                                 |
| display_name           | text        | 表示名                                       |
| has_password           | boolean     | パスワード設定済みか                         |
| last_login_provider    | text        | 直近ログインしたプロバイダー（email/google） |
| last_sign_in_at        | timestamptz | 最終ログイン日時                             |
| stripe_customer_id     | text        | StripeカスタマーID                           |
| stripe_subscription_id | text        | サブスクリプションID                         |
| subscription_status    | text        | active / inactive                            |

### `tasks`（旧 `commissions`）
依頼・タスク情報。user_idでRLS分離。

| カラム          | 型      | 説明                                                                                         | 旧名称         |
| --------------- | ------- | -------------------------------------------------------------------------------------------- | -------------- |
| id              | uuid    | PK                                                                                           |                |
| user_id         | uuid    | auth.users参照                                                                               |                |
| title           | text    | 件名                                                                                         |                |
| assignee_name   | text    | 依頼先名（必須）                                                                             | artist         |
| contact         | text    | SNS/連絡先（X ID等）                                                                         | x_id           |
| ordered_at      | date    | 依頼日                                                                                       |                |
| deadline        | date    | 納期                                                                                         |                |
| submission_date | date    | 提出日                                                                                       | rough_date     |
| price           | numeric | 金額                                                                                         |                |
| currency        | text    | 通貨（既定JPY）                                                                              |                |
| status          | text    | pending(依頼済み) / checking(確認中) / progress(対応中) / done(完成) / cancelled(キャンセル) | rough→checking |
| notes           | text    | メモ                                                                                         |                |

> ステータス `progress` の表示ラベルは「対応中」（v2.0.0で「制作中」から他業種向けに汎用化）、画像タイプ `wip` は「作業中」。
> **表示ラベルのみの変更で、DBの値（`progress` / `wip`）は不変のためマイグレーション不要**。
> ラベルは `components/TaskShared.tsx` の `STATUSES` / `IMAGE_TYPES` が唯一の定義元。

### `task_images`（旧 `commission_images`）
画像情報。Storageバケット: `task-images`（旧 `commission-images`）。

| カラム       | 型   | 説明                                                           | 旧名称        |
| ------------ | ---- | -------------------------------------------------------------- | ------------- |
| id           | uuid | PK                                                             |               |
| task_id      | uuid | tasks参照                                                      | commission_id |
| storage_path | text | `{user_id}/{task_id}/{image_type}_{timestamp}.{ext}`           |               |
| file_name    | text | 元ファイル名                                                   |               |
| image_type   | text | preview(確認用) / wip(作業中) / finished(完成) / other(その他) | rough→preview |

### `tags` / `task_tags`（v2.1.0）
タグ（ユーザーごと。名前はユーザー内で一意・30文字まで）とタスクの多対多。RLSは本人のみ。`task_tags` の付与は「自分のタスクに自分のタグ」だけ。
上限は1ユーザー100個・1タスク10個（DBトリガー `enforce_tag_limit` / `enforce_task_tag_limit` と、`lib/supabase.ts` の `TAGS_*` 定数。**変更時は両方更新**）。
`fetchTasks()` は `task_tags` を `tag_ids` に変換して返す。

### `user_settings`（拡張）
`notify_hour smallint`（0〜23・既定8）＝納期通知を受け取るJSTの時。

### `job_runs` / `stripe_events` / `notification_log` / `api_rate_limits`（service_role専用）
Cronの実行記録 / StripeイベントIDの処理済み記録（冪等性）/ 同日の重複通知防止 / APIのレート制限。いずれも anon・authenticated には権限なし。

### `push_subscriptions` / `version_releases` / `version_release_items` / `announcements` / `user_notification_status` / `user_settings` / `app_settings`
v1.2.0から変更なし。`announcements`は`target_plans`・`target_user_ids`による配信対象指定、
`app_settings`はメンテナンスモード設定（`setting_key='maintenance'`の1行）を保持する。
RLS・カラムの詳細は各マイグレーションSQLを参照。

---

## デザインシステム（v2.0.0で刷新）

[DESIGN.md](../DESIGN.md)（Apple系デザインシステム）に準拠する。単色アクセント・余白・タイポグラフィ中心の見た目で、
絵文字・紫グラデーション多用の旧デザインは廃止した。

### ファイル構成

- `app/globals.css`：デザイントークン（CSS変数）とベーススタイル（リセット・タイポグラフィ・
  `.container`等の汎用レイアウトユーティリティ）。色・角丸・影・モーション・フォントは
  すべてここで一元管理する。
- `app/components.css`：ボタン・カード・バッジ・フォーム・モーダル・アプリ共通ヘッダー/
  フッター・LP用セクション・FAQ等、アプリ全体で再利用するコンポーネントクラス。
  両ファイルとも`app/layout.tsx`でグローバルに読み込んでいる。

新しい画面・コンポーネントを作る際は、まずこの2ファイルのクラスで組み立てられないか検討し、
色や余白をその場でハードコードしない。個別のpxやレイアウト調整（flex方向、margin等）は
インラインstyleのままで構わないが、色・影・角丸・フォントは必ず`var(--xxx)`を参照すること。

### トークンの考え方（DESIGN.mdとの対応）

- **単色アクセント**：`--accent` / `--accent-fill`（Action Blue `#0066cc`）のみを強調色として使う。
  フォーカスは `--accent-focus`（`#0071e3`）、ダーク時の文字リンクは `#2997ff`（Sky Link Blue）。
  第二のブランド色・グラデーションは使わない。成功・警告・危険などの状態色は`--success`等の別トークン。
- **面の切り替えが区切り**：`--bg`（白）/ `--surface`（パーチメント `#f5f5f7`）/ `--surface-inverse`（濃色タイル `#272729`）/
  `--surface-black`（ナビ・真の黒）。LPは「濃色ヒーロー → 白 → パーチメント → 白 → 濃色CTA」で反復する。
  全幅の面を作る場合は `.tile` + `.tile-light|parchment|dark` を使う（角丸なし・上下80px）。
- **形状**：ボタンは pill（`--radius-pill`）、小ボタン`.btn-sm`は角丸8px、カードは18px、入力は11px。
  タッチターゲットは44px（`.btn`の`min-height`）。押下は`transform: scale(0.95)`。
- **影はフローティング面のみ**：`--shadow-lg`（`rgba(0,0,0,.22) 3px 5px 30px`）をモーダル・ユーザーメニューに使う。
  カード・ボタン・テキストには付けない（`--shadow-xs/sm/md`は`none`）。
- **タイポグラフィ**：`SF Pro Text/Display` → `system-ui` → `Hiragino`/`Noto Sans JP`。太さは400/600のみ（500は使わない）。
  本文17px・行間1.47。欧文用の負のトラッキングは日本語が詰まるため、本文は0・見出しは`-0.01em`に抑えている。
- **sticky帯**：`.sub-nav-frosted`（パーチメント80%+backdrop blur）を、検索バー等を固定したい場合に使う。
- **ダークモード**：DESIGN.mdはライト基調。`prefers-color-scheme: dark`では面と文字色のみ入れ替える。

### アイコン

絵文字・記号文字（✓ ← › ▾ × ＋ など）は使わず、`components/TaskShared.tsx` の `<Icon name="..." />`（自前SVG）を使う。
新しいアイコンが必要な場合は同ファイルの `ICON_PATHS`（24x24・線幅1.7前提）に追加する。`IconName`型は自動で追随する。

現在のアイコン：`bell` `mail` `plus` `chevronDown` `close` `trash` `key` `link` `settings` `camera` `download` `edit` `check` `users`
`arrowLeft` `chevronRight` `chevronLeft` `chevronUp` `refresh` `search` `filter` `calendar` `image` `logout` `user` `lock` `alert`

ブランドロゴ（Google の G）は線アイコンにせず、`GoogleLogo`（`TaskShared.tsx`・公式SVG）を使う。

### 適用状況

全面的にクラスベースへ刷新したファイル：`TaskShared.tsx`・`TaskSearchBar.tsx`・
`TaskApp.tsx`・`DemoApp.tsx`・`SystemMessage.tsx`・`ContactModal.tsx`・
`NotificationsModal.tsx`・`PushNotificationToggle.tsx`・`InstallPromptBanner.tsx`・
`AdminNotificationsPage.tsx`、および`app/login`・`app/lp`・`app/pricing`・
`app/guide`・`app/terms`・`app/privacy`・`app/tokusho`・`app/maintenance`・
`app/update-password`・`app/mgmt-c7f2a91e`の各ページ。`public/offline.html`もDESIGN.md準拠（自己完結のCSS）。

### DESIGN.md適用の仕上げ（実施済み）

- `lib/supabase.ts`の`PLAN_LIMITS`の色を単色アクセント方針へ変更（free: `#6e6e73`/`#f5f5f7`、standard: `#0066cc`/`#e8f1fb`、premium: `#ffffff`/`#1d1d1f`）。
- `app/lp/page.tsx`のナビ背景を`rgba(0,0,0,0.8)`＋`saturate(180%) blur(20px)`へ変更。
- `app/`・`components/`配下の`.tsx`の`fontWeight`を、700→600／500→400／900→700へ統一（DESIGN.mdの太さは300/400/600）。
- 記号文字を`Icon`へ置換：`✓`→`check`（LP・料金ページ）、`← 戻る`→`arrowLeft`（`.doc-back-btn`）、`← 一覧に戻る`→`arrowLeft`、
  `›`→`chevronRight`（お知らせ行）、`▾`→`chevronDown`（詳細検索）、`+`→`plus`（FAQ）、`＋ 追加`→`plus`（バージョン管理）、
  管理者ページの更新ボタン→`refresh`、`×`→`close`（DateField）。
- Googleの「G」を`GoogleLogo`（公式SVG）へ置換（ログイン画面のボタン・アバターのバッジ）。
- `public/manifest.json`の`theme_color`を`#000000`、`background_color`を`#272729`へ、`public/icon0.svg`の背景を`#272729`・チェックを`#2997ff`へ変更。
  PNGアイコン（`web-app-manifest-*.png`・`apple-touch-icon.png`・`favicon-*`）も`icon0.svg`から再生成した。
- ステータス「制作中」→「対応中」、画像タイプ「制作中」→「作業中」へ汎用化（LP・ガイド・README・各ドキュメントを含む）。
---

## プラン設定

| プラン       | 月額 | 画像上限 |
| ------------ | ---- | -------- |
| 無料         | ¥0   | 10枚     |
| スタンダード | ¥300 | 50枚     |
| プレミアム   | ¥800 | 無制限   |

---

## 名称変更（v2.0.0）の適用手順

1. 検証DBで`20260928000000_V2.0.0_rebrand_to_tasks.sql`を`--dry-run`後に適用（`docs/supabase-migration-guide.md`参照）。
2. **Storageの移行**：バケット名は変更できないため、マイグレーションは`task-images`を新設しRLSを張るのみ。
   `scripts/migrate-storage.mjs`で`commission-images`内のオブジェクトを`task-images`へコピーする
   （冪等。`storage_path`の構造は不変なのでDB更新は不要）。接続先は環境変数で切り替える（検証→本番の順）。
   ```bash
   node --env-file=.env.local scripts/migrate-storage.mjs --dry-run   # 確認のみ
   node --env-file=.env.local scripts/migrate-storage.mjs             # コピー実行（task-imagesが無ければ作成）
   node --env-file=.env.local scripts/migrate-storage.mjs --cleanup   # 検証OKなら旧バケットを空にして削除
   ```
   推奨は「DB適用前に事前コピー → DB適用＋コードデプロイ → もう一度実行して差分を拾う」。
3. 新コードを検証環境にデプロイし、依頼登録・編集・画像アップロード・納期通知Cronを確認。
4. 問題なければ本番DBへ適用し、本番デプロイ。**DB適用とコードのデプロイは同時期に行うこと**
   （旧コードは`commissions`テーブルを参照するため、片方だけ先行すると全操作が失敗する）。
5. 画像の表示・追加・削除を確認後、`--cleanup`で旧`commission-images`バケットを削除
   （DBが参照する全パスが`task-images`にあり、未コピーが0件の場合のみ削除される。不可逆なので先に`--cleanup --dry-run`）。
6. 実ドメイン確定後、`NEXT_PUBLIC_APP_URL`・`app/layout.tsx`の`metadataBase`・`lib/seo.ts`の`SITE_URL`・
   `app/tokusho/page.tsx`のURL・`app/api/request-delete/route.ts`のフォールバックURL・`public/robots.txt`のSitemap URL、
   Search Console／AdSense／Google OAuth／Supabase Redirect URLsを更新。
7. `CRON_SECRET`を再発行して Vercel に登録・Redeploy（旧`vercel.json`に平文でコミットされていた値の無効化）。

---

## RLSポリシー

`user_profiles`のRLSは無限再帰を防ぐため`is_admin()`関数（security definer）を使用。
`tasks`は`auth.uid() = user_id`のみ、`task_images`は親`tasks`のオーナーのみ操作可。
Storageは`(storage.foldername(name))[1] = auth.uid()`でフォルダ単位に制限。

管理者設定方法：
```sql
update user_profiles set is_admin = true where id = 'UUID';
```

---

## 実装済み機能一覧

- ✅ メール/パスワード認証・Googleログイン・パスワード設定/変更・Google連携/解除
- ✅ タスクの登録・編集・削除
- ✅ ステータス管理（依頼済み／確認中／対応中／完成／キャンセル）
- ✅ 納期7日前アラート（アプリ内ハイライト）・プッシュ通知（毎朝8時。CronはBearer認証）
- ✅ 画像アップロード（確認用・作業中・完成・その他）、プラン別枚数制限、拡大プレビュー・削除・ダウンロード
- ✅ 登録時の画像まとめアップロード、一覧サムネイル（署名付きURL一括取得）
- ✅ 並び替え・ステータスフィルタ・開閉式詳細検索（キーワード・依頼日/納期範囲・金額範囲）・合計金額表示
- ✅ Stripeサブスク（月額課金・解約・カスタマーポータル）
- ✅ 管理者ページ（プラン変更・ユーザー削除・メンテナンスモード）
- ✅ お知らせ・リリースノート管理（配信対象指定・プッシュ通知・未読管理）
- ✅ アカウント削除申請、お問い合わせフォーム、デモモード、PWA（ホーム画面追加バナー）
- ✅ LP・ガイド・利用規約・プライバシー・特定商取引法

---

## PWAホーム画面追加バナー

`components/InstallPromptBanner.tsx`＋`hooks/useInstallPrompt.ts`。`next/dynamic`（`ssr:false`）で遅延読み込み。

- 初回訪問では表示せず、2回目以降の訪問で表示候補。訪問回数はタブセッションごとに1回加算。
- iOSは3秒後に共有メニュー手順を案内、Androidは`beforeinstallprompt`受信1.5秒後に「追加する」ボタン付きで表示。
- 「あとで」は14日間再表示せず、3回目以降は非表示。standalone・インストール済みは表示しない。
- 状態は`/api/pwa-prompt`が`ct_pwa_prompt` Cookie（1年・HttpOnly・Secure・SameSite=Lax）に保存。DB非連携。

---

## パフォーマンス方針（要点）

- 画像の署名付きURLは`getSignedImageUrls()`で一括取得（N+1禁止）。
- クライアントでuser.id等を参照するだけなら`getSession()`を使う（`getUser()`は往復が発生）。
- 依存しないクエリは`Promise.all`。ローディングは本体データ取得後すぐ解除し、サムネイル等は裏で取得。
- 未使用時に不要なモーダルは`next/dynamic`でコード分割。GA/AdSenseは`lazyOnload`（AdSense loaderのみ通常の`<script async>`）。
- 外部キー列にはインデックスを張る（`20260922000000_..._add_performance_indexes.sql`、v2.0.0でインデックス名も`idx_tasks_*`に変更）。
- 同じデータを複数UIで使うなら共有フックへ（`useNotifications`）。

---

## TaskApp / DemoApp の共通化方針

`TaskApp.tsx`（本番）と`DemoApp.tsx`（デモ）で見た目・検索条件は同一であるべきなので、
定数・フォーマッタ・UI部品は`TaskShared.tsx`、検索ロジックは`useTaskSearch.ts`、検索バーは`TaskSearchBar.tsx`に集約している。
検索条件や見た目の変更はこの3ファイルを編集し、TaskApp/DemoApp側は極力触らない。
`useTaskSearch`は`SearchableTask`（`assignee_name`・`contact`等、DBカラム名と同じキー）を満たす型なら受け付けるため、
`Task`（本番）・`DemoTask`（デモ）ともマッピング無しで渡せる。
画像アップロード・プラン制限（Supabase Storage vs メモリのみ）は意図的に共通化していない。

### 検索パネルの設計
常時表示はステータス・並び替え・「詳細検索」ボタンのみ。キーワード・日付範囲・金額範囲・合計金額表示は開閉式パネル
（既定は閉）。条件が効いている間はボタンに件数バッジ。日付/金額が未設定のタスクはレンジ検索の対象外として除外する。
新しい検索条件もこのパネルに追加すること。

### 一覧カード（`TaskListCard`）
2行構成（件名+ステータス／依頼先名+納期）。画像枚数はサムネイル右下のバッジ。依頼日・提出日は詳細モーダルのみ。
狭い画面ではflexWrapを使わず、`flex:"1 1 0%"`+`minWidth:0`+`text-overflow:ellipsis`で省略する。

### モーダル設計
`height: calc(100vh - 32px)` / `maxHeight: 600` / flex column。タイトル・ボタン固定、コンテンツのみスクロール。
オーバーレイに`overscrollBehavior: contain`+`touchAction: none`（iOS Safariの背景スクロール防止）。

---

## セキュリティ・サーバー側検証（v2.0.1）

| 対策 | 実装 |
| --- | --- |
| 権限昇格の防止 | `user_profiles` の BEFORE UPDATE トリガー `protect_profile_columns`。`plan` / `is_admin` / `stripe_*` / `subscription_status` は、管理者・service_role（`auth.uid()` が null）以外は変更不可（42501）。`display_name` / `has_password` 等は本人が更新できる |
| 画像枚数の強制 | `task_images` の BEFORE INSERT トリガー `enforce_task_image_limit`（`PLAN_LIMIT:現在:上限` を送出）。**上限値は `lib/supabase.ts` の `PLAN_LIMITS` と同じ値をSQLにも持つため、変更時は両方更新する**。アップロード失敗時は `uploadImage` がStorageの孤児ファイルを削除する |
| 画像の形式・サイズ | `task-images` バケットに `file_size_limit`（20MiB）と `allowed_mime_types`（jpeg/png/webp/gif/heic/heif。SVGは不可） |
| パスの偽装防止 | `task_images_insert` ポリシーで `storage_path` が `{自分のuser_id}/{task_id}/…` であることを要求 |
| レート制限 | `api_rate_limits` テーブルと RPC `check_rate_limit(key, limit, window_seconds)`（service_role専用・固定ウィンドウ）。`/api/contact`（個人: 未ログイン5回/時・ログイン10回/時、全体: 300通/日）、`/api/request-delete`（3回/日）で使用。判定に失敗したときは安全側（503）に倒す |
| お問い合わせ | 自動返信は「ログイン済みで、トークンから確認できたメールアドレス」にのみ送る。入力長に上限。メール本文は常にエスケープ |
| オープンリダイレクト | `/auth/callback` の `next` は自サイト内パスのみ許可（`//`・`\\`・絶対URLは `/` にフォールバック） |
| ユーザー削除 | `/api/admin/delete-user` が、Stripeサブスクの解約 → Storage画像の削除 → `auth.users` 削除の順に実行。前段が失敗したら中断する |
| Stripe | `/api/stripe/checkout` は `STRIPE_STANDARD_PRICE_ID` / `STRIPE_PREMIUM_PRICE_ID` 以外の `priceId` を拒否 |
| メンテナンス | `middleware.ts` は anon キーで `app_settings` を取得（10秒キャッシュ）。管理者判定はユーザーのセッションで自分の `user_profiles` を読む（service_role は使わない）。`sw.js`・manifest・画像等は matcher で除外。`/api/stripe/webhook` はメンテ中も通す |
| ヘッダー | `next.config.js` で `X-Content-Type-Options` / `Referrer-Policy` / `X-Frame-Options` / `frame-ancestors` / `Permissions-Policy` / HSTS。`/sw.js` は no-cache。**CSPのスクリプト制限は未設定**（AdSense・GA・Stripeと衝突しやすいため、導入するなら Report-Only から） |
| Service Worker | `OFFLINE_CACHE` のバージョン（現在 `v2`）を、`offline.html` 変更時に必ず上げる。`activate` で旧キャッシュを削除 |
| 複数端末の通知 | `push_subscriptions` を `(user_id, endpoint)` で一意に（`endpoint` は `subscription->>'endpoint'` の生成列）。オン/オフは端末単位。失効（404/410）した購読はその端末分だけ削除。cron は購読を一括取得し、納期が近い順に並べる |
| パスワード | 最小長は新規登録・変更時のみ8文字（`PASSWORD_MIN_LENGTH`）。ログインは既存パスワードを弾かない。Supabase側の設定も8に変更すること |
| 新規テーブルのGRANT | 新規テーブルは明示的にGRANTする（`docs/supabase-migration-guide.md` の「新規テーブルのGRANT」参照） |

### 運用上の注意

- `check_rate_limit` が未適用の環境では、お問い合わせ・削除申請は503を返す（意図した挙動）。
- Vercel Analytics は `<Analytics />` を設置済みだが、Vercel Dashboard で有効化が必要。プライバシーポリシーに記載済み。
- 公開ページ・ポリシーを変更したら `app/privacy/page.tsx` の最終更新日を更新する（外部送信の公表事項を含む）。

---

## 機能メモ（v2.1.0）

| 項目 | 実装 |
| --- | --- |
| カレンダー | `components/TaskCalendar.tsx` ＋ `lib/calendar.ts`（月・週。日付は"YYYY-MM-DD"文字列のローカル計算でタイムゾーンずれを避ける。テスト済み）。表示は `useTaskSearch` の絞り込み結果と連動。表示形式は `localStorage(ct_view)` に記憶 |
| タグ | `TagPicker`（フォーム内）/ `TagManagerModal`（名前変更・削除）/ 一覧カードの `tag-pill` / 検索バーのタグ絞り込み（`tags` を渡したときだけ表示。DemoAppは渡さない） |
| 通知時刻 | `NotifySettingsModal` → `user_settings.notify_hour`。通知のオン/オフは端末ごと（`PushNotificationToggle`） |
| アカウント削除 | `DeleteAccountModal` → `POST /api/account/delete`（メール確認＋パスワード、Googleのみは直近15分以内のログイン。管理者は不可。5回/日）。Stripe解約→画像削除→auth削除は `lib/server/delete-account.ts`（管理者削除と共通） |
| Stripe | Webhookは `stripe_events` で冪等。`subscription.created/updated` はStripeから最新状態を再取得して反映（順序非依存）。`past_due` は状態のみ記録しプラン維持、`canceled/unpaid/incomplete_expired` は無料へ（別サブスクへ乗り換え済みなら戻さない）。`invoice.payment_failed`（初回決済を除く）でユーザーへメール、`invoice.paid` で復帰。Checkoutは動的な支払い方法・`client_reference_id`・メタデータ付き |
| 監視 | `/api/health`、`job_runs`、`alertAdmin()`（`lib/server/monitor.ts`）。Webhook・Cronの失敗は管理者へメール |
| DB性能 | RLSの `auth.uid()` / `is_admin()` を `(select …)` で包む（initPlan化）、Cron用の部分インデックス `idx_tasks_active_deadline`、FKインデックス、`search_path` の固定 |
| AdSense | `AdSenseLoader` が `/lp /guide /terms /privacy /tokusho` だけでスクリプトを挿入。所有確認用metaは全ページ（`layout.tsx`） |

### 未検証・要注意

- Cron・Webhook・各APIルートは型チェックとDB層（実PostgreSQLでの権限・トリガー・RLS・インデックス）の検証は済んでいるが、Stripe・Resend・Web Pushの実サービスに対する結合テストは未実施。検証環境（Stripeはテストモード）で必ず確認すること。
- 毎時Cronは Vercel Pro 前提。

## TODO / 今後の対応予定

- **Resendを使ったSupabase Auth用SMTP設定**：現状Supabase Authのメールは標準送信機能を利用。
  送信元ドメイン独自化・到達率向上のため、Supabase Dashboard → Authentication → Emails → SMTP Settingsに
  Resend経由のカスタムSMTPを設定する予定（`RESEND_API_KEY`とは別にSMTP用認証情報が必要）。設定後は本項を更新すること。
  **優先度は高い**（標準のメール送信は上限が低く、確認メール・リセットメールが詰まる）。
  設定値: ホスト `smtp.resend.com` / ポート `465`（または`587`）/ ユーザー名 `resend` / パスワード=ResendのAPIキー。
  送信元には認証済みの独自ドメインが必要。設定後は Authentication の Rate Limits も見直す。
- 実ドメイン確定に伴うURL差し替え（上記「名称変更の適用手順」6）。
- `CRON_SECRET`の再発行・登録（上記「ローテーション」）。
- バージョン履歴への2.0.0〜2.1.0登録は管理画面（`/mgmt-c7f2a91e/notifications`）から行う。
- 任意の強化: Sentry等のエラー監視（クライアント側の例外）、OG画像（1200×630）、FAQのJSON-LD、画像のリサイズ・圧縮、CSVエクスポート、繰り返しタスク、LP/ガイドのサーバーコンポーネント化（`BackButton`のみクライアント）。
- 利用規約の見直し（反社条項・ユーザーコンテンツの権利・サービス終了時の扱い・返金条項）、インボイス対応方針の確認（要専門家レビュー）。
- `supabase/migrations/20260501000000_V1.1.0_add_version_releases copy.sql`（ファイル名に空白と`copy`）は
  `20260501000001_V1.1.0_add_notifications.sql`と同一テーブルを作る重複の可能性がある。適用済みの履歴を確認し、
  不要なら`migration repair`で整理する（適用済みファイルは編集しない）。

---

## バージョン履歴

| バージョン | 内容                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- |
| 1.0.0      | 正式リリース                                                                            |
| 1.0.1      | タイムゾーン修正・ガイドページ更新・カレンダービュー追加                                |
| 1.0.2      | 文字入力時の自動ズームインの抑制                                                        |
| 1.0.3      | Google認証                                                                              |
| 1.1.0      | お知らせ・リリースノート統合管理・未読バッジ通知                                        |
| 1.2.0      | 配信対象指定・プッシュ通知、PWA/メンテナンス対応、SEO強化、認証・通知・エラー画面の改善 |
| 2.0.0      | 「ツクリスト」へ改称。汎用タスク管理向けに用語・テーブル・カラム・バケット名を変更。DESIGN.md準拠のデザイン刷新、Cron認証をBearerヘッダーへ変更。ステータス「制作中」を「対応中」へ汎用化（表示ラベルのみ） |
| 2.0.1      | セキュリティ強化（権限昇格防止・サーバー側検証・レート制限・Stripe/画像のユーザー削除連動・複数端末通知・セキュリティヘッダー）、Next.js 14.2.35、プライバシーポリシー更新 |
| 2.1.0      | タグ・カレンダー・通知時刻の設定、本人による即時アカウント削除、Cron拡張（毎時・並列・重複防止・実行記録）、監視（ヘルスチェック・アラート）、Stripe冪等化と支払い失敗対応、DB性能改善、AdSenseを公開ページに限定 |

リリース履歴（`version_releases`）への2.0.0登録は管理画面（`/mgmt-c7f2a91e/notifications`）から行う。

---

## 注意事項

- `mgmt-c7f2a91e`が管理者ページのURL。お知らせ管理は`/mgmt-c7f2a91e/notifications`。
- Resend無料プランは`onboarding@resend.dev`からのみ送信。独自ドメイン設定後は各routeの`from`を変更。
- Service Role Keyはフロントエンドに露出させない。Stripeのテストキーと本番キーを混在させない。
- シークレット（`CRON_SECRET`等）を`vercel.json`・ソース・URLに書かない。漏れた場合は再発行する。
- Cron Jobは本番環境（mainブランチ）のみ実行される。iOSのプッシュ通知はPWA必須（iOS 16.4以降）。
- モーダル内の`autoFocus`は削除済み（iOS Safariのキーボード即時展開防止）。
- `redirectTo`を使うAPI（`resetPasswordForEmail`・`linkIdentity`・`signInWithOAuth`）のURLは必ずSupabaseのRedirect URLsに登録
  （未登録だとSite URLへ黙ってフォールバックし意図せず自動ログインする。詳細: `docs/google-login-setup.md`）。
- お知らせ・リリースの取得と未読判定は`useNotifications`に集約。公開日がアカウント作成日より前のものは常に既読扱い（クライアント導出、DB書き込みなし）。
- 直近ログインプロバイダーは`user_profiles.last_login_provider`が正。ログイン画面向けにはHttpOnly Cookie（`ct_last_login_provider`）のみ。
- Google専用ユーザーのパスワード追加は、既存のリセット導線（`resetPasswordForEmail`→`/auth/confirm`→`/update-password`）を再利用する
  （Admin API・`updateUser`ではemail identityが正規リンクされない）。`/auth/confirm`は`token_hash`+`type`と`code`（PKCE）の両方に対応。
- パスワード未設定かつGoogleのみのユーザーは`unlinkIdentity()`が仕様上失敗するため、UIでパスワード設定/削除申請へ誘導する。
- 新規ユーザー作成トリガー`handle_new_user`は`display_name`初期値も設定（メール登録は`options.data.display_name`、Googleは`full_name`/`name`）。
- メール形式チェック・表示名上限（30）・パスワード最小長（6）は`lib/supabase.ts`の共通定義を参照する。
- 新規のマイグレーションは必ずファイル化してから適用し、適用済みファイルは編集しない（`docs/supabase-migration-guide.md`）。
- シークレットや内部エラーの詳細をAPIレスポンスに含めない（ログにだけ出す）。ユーザー入力をメールHTMLに入れる場合は必ずエスケープする。
- 公開しない関数・テーブルは `revoke` して必要なロールにだけ `grant` する（`check_rate_limit` が実装例）。
