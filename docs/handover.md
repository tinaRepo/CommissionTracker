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
├── globals.css
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
    ├── cron/deadline-notify/route.ts   # 毎朝8時（UTC23時）の納期通知Cron（tasksテーブル参照）
    ├── admin/{delete-user,notify-push}/route.ts
    ├── auth/last-login-provider/route.ts
    ├── request-delete/route.ts
    └── contact/route.ts

components/
├── TaskApp.tsx                 # メインアプリUI（旧 CommissionApp.tsx）
├── DemoApp.tsx                 # デモモード（Supabase不使用・メモリのみ）
├── TaskShared.tsx              # TaskApp/DemoApp共通の定数・フォーマッタ・UI部品
│                                # （旧 CommissionShared.tsx。STATUSES/IMAGE_TYPES/fmtDate/fmtShortDate/fmtPrice/daysUntil/
│                                #   Field/DateField/DateRangeField/StatusBadge/TaskListCard）
├── TaskSearchBar.tsx           # 共通検索バー（旧 CommissionSearchBar.tsx）
├── PageViewTracker.tsx
├── PushNotificationToggle.tsx
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
└── supabase.ts                 # Supabaseクライアント・型（Task/TaskImage/TaskStatus等）・API関数

public/                         # ads.txt, manifest.json, sw.js, offline.html, アイコン類, robots.txt

scripts/
└── migrate-storage.mjs         # commission-images → task-images のStorage移行（冪等・--dry-run / --cleanup）

supabase/migrations/
├── ...（既存）
├── 20260927000000_V1.2.0_announcements_targeting.sql
├── 20260927000001_V1.2.0_add_maintenance_mode.sql
└── 20260928000000_V2.0.0_rebrand_to_tasks.sql   # commissions→tasks 等の名称変更

vercel.json                     # Cron Job設定（毎日UTC23時=JST8時）
middleware.ts                   # メンテナンスモード時の全画面/API制御
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

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # サーバーサイドのみ

# Resend
RESEND_API_KEY=
ADMIN_EMAIL=

# アプリURL（ドメイン確定後に実URLへ。例: https://commission-tracker-nine.vercel.app）
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
CRON_SECRET=
```

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
| status          | text    | pending(依頼済み) / checking(確認中) / progress(制作中) / done(完成) / cancelled(キャンセル) | rough→checking |
| notes           | text    | メモ                                                                                         |                |

### `task_images`（旧 `commission_images`）
画像情報。Storageバケット: `task-images`（旧 `commission-images`）。

| カラム       | 型   | 説明                                                           | 旧名称        |
| ------------ | ---- | -------------------------------------------------------------- | ------------- |
| id           | uuid | PK                                                             |               |
| task_id      | uuid | tasks参照                                                      | commission_id |
| storage_path | text | `{user_id}/{task_id}/{image_type}_{timestamp}.{ext}`           |               |
| file_name    | text | 元ファイル名                                                   |               |
| image_type   | text | preview(確認用) / wip(制作中) / finished(完成) / other(その他) | rough→preview |

### `push_subscriptions` / `version_releases` / `version_release_items` / `announcements` / `user_notification_status` / `user_settings` / `app_settings`
v1.2.0から変更なし。`announcements`は`target_plans`・`target_user_ids`による配信対象指定、
`app_settings`はメンテナンスモード設定（`setting_key='maintenance'`の1行）を保持する。
RLS・カラムの詳細は各マイグレーションSQLを参照。

---

## デザインシステム（v2.0.0で刷新）

絵文字・紫グラデーション多用の「AIが作った感」のある見た目から、
[Apple系デザインシステム](https://getdesign.md/apple/design-md)を参考にした
単色アクセント・余白・タイポグラフィ中心の見た目に刷新した。

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

### トークンの考え方

- **単色アクセント**：`--accent`（インディゴ）のみを強調色として使い、グラデーションは
  使わない。旧デザインの紫グラデーションボタン・ヘッダーは廃止した。
- **ニュートラルな余白重視のレイアウト**：`--surface`/`--surface-2`等の低彩度背景と、
  十分な余白（`--gutter`、`.section`の`padding: 96px 24px`等）で情報を整理する。
- **最小限のラインアイコン**：絵文字（🎨🔔✉️⭐等）の多用はAI生成特有の見た目になりやすいため、
  ナビゲーション等の主要アイコンは`components/TaskShared.tsx`の`<Icon name="..." />`
  （軽量な自前SVGパス）に置き換えた。新しいアイコンが必要な場合もここに追加し、
  絵文字を新たに増やさないこと。
- **ダーク/ライトの切り替え面**：アプリのヘッダー・LP・ログイン画面は`--surface-inverse`
  （濃色面）、本文エリアは`--bg`/`--surface`（淡色面）という二面構成にしている
  （Apple系デザインの「白黒セクションの反復」を踏襲）。

### 適用状況

全面的にクラスベースへ刷新したファイル：`TaskShared.tsx`・`TaskSearchBar.tsx`・
`TaskApp.tsx`・`DemoApp.tsx`・`SystemMessage.tsx`・`ContactModal.tsx`・
`NotificationsModal.tsx`・`PushNotificationToggle.tsx`・`InstallPromptBanner.tsx`・
`AdminNotificationsPage.tsx`、および`app/login`・`app/lp`・`app/pricing`・
`app/guide`・`app/terms`・`app/privacy`・`app/tokusho`・`app/maintenance`・
`app/update-password`・`app/mgmt-c7f2a91e`の各ページ。

新しい画面を追加する場合も、既存ページと同じ`.doc-header`/`.hero`/`.card`/`.modal-*`等の
クラスを再利用し、独自の配色・ボタンスタイルを新設しないこと。

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
2. **Storageの移行**：`node --env-file=.env.local scripts/migrate-storage.mjs`(まず --dry-run)。DB 適用前に事前コピーし、デプロイ直後に再実行して差分を拾う。検証後 `--cleanup` で旧バケットを削除。
3. 新コードを検証環境にデプロイし、依頼登録・編集・画像アップロード・納期通知Cronを確認。
4. 問題なければ本番DBへ適用し、本番デプロイ。**DB適用とコードのデプロイは同時期に行うこと**
   （旧コードは`commissions`テーブルを参照するため、片方だけ先行すると全操作が失敗する）。
5. 移行確認後、旧`commission-images`バケットを削除。
6. 実ドメイン確定後、`NEXT_PUBLIC_APP_URL`・`app/layout.tsx`の`metadataBase`・`lib/seo.ts`の`SITE_URL`・
   `app/tokusho/page.tsx`のURL・`app/api/request-delete/route.ts`のフォールバックURL・`public/robots.txt`のSitemap URL、
   Search Console／AdSense／Google OAuth／Supabase Redirect URLsを更新。

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
- ✅ ステータス管理（依頼済み／確認中／制作中／完成／キャンセル）
- ✅ 納期7日前アラート（アプリ内ハイライト）・プッシュ通知（毎朝8時）
- ✅ 画像アップロード（確認用・制作中・完成・その他）、プラン別枚数制限、拡大プレビュー・削除・ダウンロード
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

## TODO / 今後の対応予定

- **Resendを使ったSupabase Auth用SMTP設定**：現状Supabase Authのメールは標準送信機能を利用。
  送信元ドメイン独自化・到達率向上のため、Supabase Dashboard → Authentication → Emails → SMTP Settingsに
  Resend経由のカスタムSMTPを設定する予定（`RESEND_API_KEY`とは別にSMTP用認証情報が必要）。設定後は本項を更新すること。
- 実ドメイン確定に伴うURL差し替え（上記「名称変更の適用手順」6）。
- `package.json`の`name`（`commission-tracker`）は未変更。必要なら`tsukurist`へ変更し、`npm version`で更新（`docs/update-notes.md`）。
- ステータス「制作中」は創作寄りの語のため、他業種向けに「対応中」等へ汎用化するかは要検討（現状は要望どおり維持）。

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
| 2.0.0      | 「ツクリスト」へ改称。汎用タスク管理向けに用語・テーブル・カラム・バケット名を変更      |

リリース履歴（`version_releases`）への2.0.0登録は管理画面（`/mgmt-c7f2a91e/notifications`）から行う。

---

## 注意事項

- `mgmt-c7f2a91e`が管理者ページのURL。お知らせ管理は`/mgmt-c7f2a91e/notifications`。
- Resend無料プランは`onboarding@resend.dev`からのみ送信。独自ドメイン設定後は各routeの`from`を変更。
- Service Role Keyはフロントエンドに露出させない。Stripeのテストキーと本番キーを混在させない。
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
