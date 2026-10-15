# 📋 ツクリスト

依頼・タスクの納期、金額、確認用画像をまとめて管理できる Web アプリです。
イラスト依頼に限らず、デザイン・動画・執筆・開発など外注・制作物の依頼全般で使えます。

**技術構成:** Next.js 14 (App Router) + Supabase + Vercel

---

## 目次

- [📋 ツクリスト](#-ツクリスト)
  - [目次](#目次)
  - [1. Supabase セットアップ](#1-supabase-セットアップ)
    - [1-1. プロジェクト作成](#1-1-プロジェクト作成)
    - [1-2. DB・RLS・Storage の構築](#1-2-dbrlsstorage-の構築)
    - [1-3. 認証プロバイダーの設定](#1-3-認証プロバイダーの設定)
    - [1-4. URL Configuration](#1-4-url-configuration)
    - [1-5. API キーの確認](#1-5-api-キーの確認)
  - [2. ローカル動作確認（任意）](#2-ローカル動作確認任意)
    - [初回セットアップ（1 回だけ）](#初回セットアップ1-回だけ)
    - [起動](#起動)
  - [3. Vercel デプロイ](#3-vercel-デプロイ)
  - [4. 外部サービス設定](#4-外部サービス設定)
    - [Resend（メール送信）](#resendメール送信)
    - [Stripe（サブスクリプション）](#stripeサブスクリプション)
    - [Web Push（プッシュ通知）](#web-pushプッシュ通知)
    - [Cron Jobの認証（CRON\_SECRET）](#cron-jobの認証cron_secret)
  - [5. 管理者設定](#5-管理者設定)
  - [6. 機能一覧](#6-機能一覧)
  - [7. プラン制限](#7-プラン制限)
  - [8. パフォーマンスに関する実装方針](#8-パフォーマンスに関する実装方針)
  - [9. SEO・広告運用](#9-seo広告運用)
  - [10. デザイン方針](#10-デザイン方針)
  - [開発者向け資料](#開発者向け資料)

---

## 1. Supabase セットアップ

### 1-1. プロジェクト作成

[supabase.com](https://supabase.com) → **New project** でプロジェクトを作成します。

### 1-2. DB・RLS・Storage の構築

DBの変更・反映方法は [docs/database-operations.md](docs/database-operations.md) を参照してください。

### 1-3. 認証プロバイダーの設定

**Dashboard → Authentication → Providers** で以下を有効化します。

**Email**
- デフォルトで有効
- *Confirm email* はオフ推奨（開発中）

**Google**
1. [Google Cloud Console](https://console.cloud.google.com) で OAuth アプリを作成
2. Client ID / Secret を Supabase の Google プロバイダー設定に入力
3. Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

> 📄 詳細は [docs/google-login.md](docs/google-login.md) を参照してください。

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
3. **Environment Variables** に以下を追加してデプロイ（雛形は `.env.example`）

| 環境変数                               | 値                            | 備考                                                                                  |
| -------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase の Project URL       |                                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Supabase の anon key          |                                                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`            | Supabase の service_role key  | ⚠️ サーバーサイド専用                                                                  |
| `RESEND_API_KEY`                       | Resend の API キー            |                                                                                       |
| `ADMIN_EMAIL`                          | 削除申請メールの受信アドレス  |                                                                                       |
| `NEXT_PUBLIC_APP_URL`                  | Vercel のデプロイ URL         | 例: `https://your-app.vercel.app`（パスなし。通知のリンク先に使用）                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`   | Stripe の公開鍵               |                                                                                       |
| `STRIPE_SECRET_KEY`                    | Stripe の秘密鍵               | ⚠️ サーバーサイド専用                                                                  |
| `STRIPE_WEBHOOK_SECRET`                | Stripe Webhook のシークレット |                                                                                       |
| `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` | プラン変更按分対応ポータルの Configuration ID | Stripe Dashboard で作成した設定を指定 |
| `STRIPE_STANDARD_PRICE_ID`             | スタンダードプランの Price ID | サーバーサイド用                                                                      |
| `STRIPE_PREMIUM_PRICE_ID`              | プレミアムプランの Price ID   | サーバーサイド用                                                                      |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | スタンダードプランの Price ID | フロント用                                                                            |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`  | プレミアムプランの Price ID   | フロント用                                                                            |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | Web Push の公開鍵             |                                                                                       |
| `VAPID_PRIVATE_KEY`                    | Web Push の秘密鍵             |                                                                                       |
| `VAPID_EMAIL`                          | Web Push 送信元メール         | 例: `mailto:xxx@example.com`                                                          |
| `CRON_SECRET`                          | Cron Job 認証用シークレット   | ⚠️ 16文字以上。自分で生成する（[4. 外部サービス設定](#cron-jobの認証cron_secret)参照） |
| `HEALTHCHECKS_PING_URL`                | 死活監視の ping URL（任意）   | Healthchecks.io 等で作成。Cron 成功のたびに ping し、途切れると通知される             |

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

> Supabase Authのメール送信元を独自ドメインにする場合は、Resend SMTPを設定してください。

### Stripe（サブスクリプション）

月額課金（スタンダード・プレミアム）に使用します。

1. [stripe.com](https://stripe.com) でアカウント作成
2. **Products** でスタンダード（¥300/月）・プレミアム（¥800/月）の商品を作成
3. 各 Price ID を環境変数に設定
4. **Webhooks** に `https://your-app.vercel.app/api/stripe/webhook` を登録し、次のイベントを有効化：
   `checkout.session.completed` / `checkout.session.async_payment_succeeded` /
   `customer.subscription.created` / `customer.subscription.updated` / `customer.subscription.deleted` /
   `invoice.payment_failed` / `invoice.paid`
   （同じイベントが再送されても1回しか処理しません。処理に失敗した場合は管理者へメールが届きます。
   `stripe_events` を含むSupabase migrationも適用してください。）
5. **Customer portal** の設定を作成します。プラン変更はスタンダード・プレミアム間を有効にし、`subscription_update.proration_behavior` を `always_invoice` にします。解約機能はCustomer portalでは無効にしてください。アプリ内で解約処理と日割り額のカード返金を行います。
6. 作成した設定の Configuration ID を `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` として Vercel に登録し、再デプロイします。未設定時は設定されていないポータルへ誤って遷移しないよう、アプリからプラン管理を開けません。

> テストキー（`sk_test_`）と本番キー（`sk_live_`）を混在させないこと。

### Web Push（プッシュ通知）

納期リマインダー通知（毎朝 8 時・日本時間）に使用します。

```bash
# VAPID キーペアの生成
npx web-push generate-vapid-keys
```

生成された公開鍵・秘密鍵をそれぞれ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` に設定します。

> iOS でのプッシュ通知はホーム画面追加（PWA）が必須です（iOS 16.4 以降）。

### Cron Jobの認証（CRON_SECRET）

納期通知は `vercel.json` の Cron（**毎日 8:00・日本時間**に実行）が `/api/cron/deadline-notify` を呼び出して実行します。
納期が7日以内の未完了タスクがあるユーザーのうち、プッシュ通知を有効にしている端末へ送信します。
VercelのCron式はUTC基準で、`0 23 * * *` が毎日8:00（日本時間）に相当します。Healthchecks.ioもCron式 `0 23 * * *`、タイムゾーン `UTC`、Grace Time `15 minutes` に設定してください。
このルートは **`Authorization: Bearer <CRON_SECRET>` ヘッダーが一致しないリクエストを 401 で拒否**します
（`CRON_SECRET` が未設定・16 文字未満の場合も常に拒否）。

`CRON_SECRET` は外部サービスから発行されるものではなく、**自分でランダム文字列を生成**して Vercel に登録します。

```bash
# 1. 生成（どちらか）
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. **Vercel Dashboard → Project → Settings → Environment Variables** に `CRON_SECRET` を追加（Production）
3. **Redeploy** する（Vercel Cron は `CRON_SECRET` が設定されていれば、上記ヘッダーを自動で付けて呼び出す）
4. ローカルで試す場合は `.env.local` に同じ値を書く（`vercel env pull .env.local` でも取得可）

動作確認:

```bash
# ヘッダーなし → 401 になること（通知は送られない）
curl -i https://your-app.vercel.app/api/cron/deadline-notify
```

> ⚠️ 正しいヘッダー付きで呼ぶと**実際に購読中ユーザーへ通知が送信されます**。
> 手動実行は Vercel Dashboard → Project → Settings → Cron Jobs の「Run」ボタンで行うか、検証環境で行ってください。
>
> ⚠️ シークレットを `vercel.json` の URL（`?secret=...`）に書かないこと。リポジトリ・ログ・履歴に残ります。
> 過去にコミットしたシークレットは**必ず再発行（ローテーション）**してください。
>
> Cron は **Production デプロイ（main ブランチ）でのみ**実行されます。
>
> HobbyプランのCron実行回数制限に合わせ、毎日1回のスケジュールにしています。なお、Hobbyは非商用利用向けのため、課金・広告のある本サービスで利用するプランはVercelの最新の利用条件を確認してください。

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

4. ログイン後、右上のユーザーメニュー → **「管理者ページ」** から管理画面へ

管理者ページ URL: `/mgmt-c7f2a91e`（推測されにくい形式）
お知らせ・バージョン管理 URL: `/mgmt-c7f2a91e/notifications`

---

## 6. 機能一覧

**タスク管理**
- ✅ タスク（依頼）の登録・編集・削除
- ✅ ステータス管理（依頼済み / 確認中 / 対応中 / 完成 / キャンセル）
- ✅ 納期 7 日前の警告表示
- ✅ ステータスのプルダウン検索・並び替え
- ✅ タグ（カテゴリ・案件名など。1タスク10個・全体100個まで。タスクのフォームで作成・選択、一覧のプルダウンで絞り込み、ユーザーメニューから名前変更・削除）
- ✅ カレンダービュー（月・週。納期の日にタスクを表示。ステータス・検索の絞り込みと連動。表示形式は記憶）
- ✅ 開閉式の詳細検索パネル（既定は折りたたみ）：キーワード検索（件名・依頼先名・連絡先・メモ）、
  依頼日・納期のFrom-To日付範囲検索、金額の範囲検索
- ✅ 検索結果の合計金額表示（チェックボックスで切替、既定は非表示）

**画像**
- ✅ タスク登録時に画像をまとめてアップロード（新規登録フォームから追加可能）
- ✅ 確認用・作業中・完成・その他の画像アップロード（Supabase Storage `task-images`）
- ✅ 一覧カードにサムネイル表示（最初の 1 枚。画像枚数はサムネイルに重ねたバッジで表示。署名付きURLはまとめて1回で取得）
- ✅ タスク一覧カードはコンパクトな2行構成（タイトル+ステータス／依頼先名+納期のみ）。詳細な日付はカードをタップした先の詳細画面で確認
- ✅ 画像の拡大プレビュー・削除・ダウンロード（元画質保持）
- ✅ プランごとの画像枚数制限

**認証・アカウント**
- ✅ メール / パスワード・Google ログイン
- ✅ パスワードリセット（メール送信）
- ✅ 表示名の設定
- ✅ アカウントの即時削除（本人がユーザーメニューから実行。メールアドレス＋パスワード（Googleのみの場合は直近ログイン）で本人確認。Stripeの即時解約・画像削除を含む）
- ✅ ユーザーごとにデータが完全分離（RLS）
- ✅ パスワードの設定・変更（ログイン後の画面から。Google登録ユーザーは初回設定可）
- ✅ 直近のログイン方法の表示（Googleログイン時にアバターへバッジ表示）
- ✅ ログイン画面での前回ログイン方法の表示（HttpOnly Cookie + サーバーAPI経由、DBが正）
- ✅ メールアドレス登録時の表示名必須入力
- ✅ Googleアカウント登録時、Google側の名前を表示名として自動反映
- ✅ 最終ログイン日時の記録

**通知**
- ✅ 毎朝8時（日本時間）のプッシュ通知（納期 7 日以内。同じ日の重複送信防止。Cron は `CRON_SECRET` のBearer認証で保護。複数端末で購読可能）
- ✅ 管理者がお知らせを新規作成した時、配信対象ユーザーへプッシュ通知
- ✅ 管理者が新しいバージョン情報を登録した時、購読中の全ユーザーへプッシュ通知
- ✅ お知らせ・リリースノート（未読バッジ通知・モーダル表示。取得・未読判定は`hooks/useNotifications.ts`に一本化）
- ✅ アカウント作成日より前に公開されたお知らせ・リリースノートは自動的に既読扱い（新規登録直後に過去の告知で未読バッジが立たない）
- ✅ お問い合わせフォーム（モーダル表示・管理者通知。自動返信はログイン済みユーザーのみ。IP／ユーザー単位のレート制限あり）

**課金**
- ✅ Stripe サブスク（月額課金・解約・カスタマーポータル）
- ✅ 支払い失敗への対応（`past_due`の記録・ユーザーへの連絡メール・画面上の警告と支払い方法の更新ボタン。復旧時に自動で戻る）
- ✅ Webhookの冪等化・順序非依存（最新のサブスク状態をStripeから取得して反映）

**運用・監視**
- ✅ `/api/health`（死活監視。`?deep=1` + Bearer でCronの最終成功時刻まで確認）
- ✅ Cronの実行記録（`job_runs`）と、異常時の管理者メール・Healthchecks.io通知（任意）
- ✅ CI（型チェック・lint・ビルド）

**管理者**
- ✅ ユーザー一覧・プラン変更・ユーザー削除
- ✅ お知らせ管理（登録・編集・削除、全員・プラン別・ユーザー指定の配信対象設定と新規作成時のプッシュ通知）
- ✅ バージョン管理（登録・編集・削除・更新内容管理、新規登録時の全購読者向けプッシュ通知）
- ✅ メンテナンスモード（管理者ページから公開停止・再開、利用者向け案内文を設定）

**UI / UX**
- ✅ DESIGN.md（Apple系デザインシステム）準拠のデザイントークン（単色アクセント・フラット・pill ボタン）
- ✅ 自前SVGのラインアイコン（`components/TaskShared.tsx` の `Icon`。絵文字・記号文字は使わない）
- ✅ 全モーダル固定サイズ統一（`height: calc(100vh - 32px)` + `maxHeight: 600`）
- ✅ タイトル・ボタン固定 / コンテンツスクロールのモーダル構造
- ✅ モーダル表示時の背景スクロールロック（iOS Safari 対応）
- ✅ ユーザーメニューのテキスト折り返し防止

**その他**
- ✅ デモモード（ログイン不要・メモリのみ・お知らせ・お問い合わせボタン付き。検索UX・お知らせ閲覧はTaskAppと共通コンポーネント、お知らせは未読管理なしの読み取り専用）
- ✅ PWA 対応（ホーム画面追加。Androidではインストール操作、iOSではSafariの共有メニューから追加する方法を案内するバナーを表示。表示履歴はAPI管理のHttpOnly Cookieに保存）
- ✅ LP・利用規約・プライバシーポリシー・特定商取引法ページ

---

## 7. プラン制限

| プラン       | 月額 | 画像保存（アカウント合計） |
| ------------ | ---- | -------------------------- |
| 無料         | ¥0   | 10 枚まで                  |
| スタンダード | ¥300 | 50 枚まで                  |
| プレミアム   | ¥800 | 無制限                     |

---

## 8. パフォーマンスに関する実装方針

ログイン直後の表示速度や、お知らせモーダルの表示速度の改善のために取り入れている
実装方針です。今後コードを追加・変更する際もこの方針に沿ってください。

- **画像の署名付きURLはまとめて取得する**：画像を複数枚扱う場面（一覧のサムネイル・
  詳細モーダルなど）では、`lib/supabase.ts` の `getSignedImageUrl()`（1枚用）を
  ループで呼ばず、`getSignedImageUrls(paths: string[])`（複数枚まとめて署名するAPI）
  を使うこと。1枚ずつ呼ぶと画像枚数分のリクエストが発生するN+1問題になる。
- **`getSession()` を優先する**：クライアント側でログイン中ユーザーのidやemailを
  参照するだけの場面では、Authサーバーへの検証往復が発生する `supabase.auth.getUser()`
  ではなく、ローカルのセッション情報を返す `supabase.auth.getSession()` を使うこと。
  RLSで保護された書き込み操作はJWT署名がサーバー側で検証されるため、安全性は変わらない。
- **依存関係のないクエリは並列実行する**：複数のSupabaseクエリを実行する際、
  互いの結果に依存しないものは `await` を直列に並べず `Promise.all` でまとめて実行すること。
- **ローディング状態は「本体データ」が揃った時点で解除する**：サムネイルなど
  付随的なデータの取得を待ってから読み込み中表示を解除しないこと。本体（一覧・詳細等）が
  表示できる状態になったら先に画面を出し、付随データは裏で継続取得して差し込む。
- **開かれるまで使わないUIはコード分割する**：モーダルなど「常にマウントされているが
  ユーザー操作まで使われない」コンポーネントは `next/dynamic`（`{ ssr: false }`）で
  読み込み、メイン画面の初期JSバンドルに含めないこと（`NotificationsModal`・
  `ContactModal`・ログイン画面の`DemoApp`が実装例）。
- **外部キー列にはインデックスを張る**：PostgreSQLは外部キーに自動でインデックスを
  作成しないため、新しいテーブル・外部キー列を追加する際はインデックス追加も
  合わせて検討すること（`supabase/migrations/20260922000000_V1.2.0_add_performance_indexes.sql`
  が既存テーブルへの追加例）。
- **サードパーティスクリプトは`lazyOnload`を優先する**：GA・広告など計測系の
  外部スクリプトは、メインコンテンツの表示・操作可能化をブロックしないよう
  `next/script`の`strategy="lazyOnload"`を基本とすること（AdSense loaderのみ、
  `data-nscript`属性を避けるため通常の`<script async>`）。
- **同じデータを複数箇所で使うなら共有フックに寄せる**：ヘッダーの未読バッジと
  お知らせモーダルのように、複数のUIが同じデータ（お知らせ・リリースノート等）を
  必要とする場合は、コンポーネントごとに個別取得させず`hooks/`配下に共有フックを
  作り、データ取得元を1つに統一すること（実装例: `hooks/useNotifications.ts`）。
- **本番とデモで表示・検索ロジックが同じ部分は共通化する**：`TaskApp.tsx`
  （本番）と`DemoApp.tsx`（ログイン不要のデモ）は見た目・検索条件が同じである
  べきなので、定数・フォーマッタ・UI部品（一覧カードの`TaskListCard`・`Icon`を含む）は
  `components/TaskShared.tsx`、検索・フィルタ・並び替えのロジックは
  `hooks/useTaskSearch.ts`、検索バーのUIは`components/TaskSearchBar.tsx`に集約している。
  新しい検索条件や見た目の変更は、この3ファイルを編集し、
  `TaskApp.tsx`/`DemoApp.tsx`側は極力変更しないこと。
  一方、画像アップロード・プラン制限など実装の意味が本質的に異なる部分
  （Supabase Storage・課金プラン vs. メモリのみの疑似アップロード）は
  無理に共通化していない。
- **スマホの狭い画面幅ではflexWrapによる折り返しに注意する**：一覧カードのように
  情報量が多い行は、`flexWrap: "wrap"`で複数要素を並べると狭い画面幅で
  折り返しが多発し、カードの高さが不安定に伸びてしまう。折り返しを許容しない
  1行に収めたい場合は、重要度の低い項目を削るか、`flex: "1 1 0%"` +
  `minWidth: 0` + `text-overflow: ellipsis`で省略表示にすること
  （実装例: `components/TaskShared.tsx`の`TaskListCard`）。

---

## 9. SEO・広告運用

Google Search Console・Google AdSenseの設定は、[docs/seo-ads-guide.md](docs/seo-ads-guide.md) を参照してください。

---

## 10. デザイン方針

見た目は [DESIGN.md](DESIGN.md)（Apple系デザインシステム）に準拠しています。

- 色・角丸・影・フォントは `app/globals.css` のトークン（`var(--xxx)`）、
  ボタン・カード・バッジ・モーダル等は `app/components.css` の共通クラスで定義する。
  **ページ・コンポーネント側で色や影をハードコードしない。**
- アクセントは Action Blue（`--accent` `#0066cc`）の**単色のみ**。第二のブランド色・グラデーションは使わない
  （成功・警告・危険などの状態色は別トークン）。
- 影は浮遊する面（モーダル・ユーザーメニュー）のみ。カード・ボタン・テキストには付けない。
- 太さは 400 / 600（500 は使わない）。ボタン押下は `scale(0.95)`。
- アイコンは `components/TaskShared.tsx` の `<Icon name="..." />`（自前SVG）。
  新しいアイコンは `ICON_PATHS` に追加し、絵文字・記号文字（✓ ← › ▾ ×など）は使わない。
  ブランドロゴ（Google の G）は線アイコンにせず、`GoogleLogo`（`TaskShared.tsx`・公式SVG）を使う。

---

## 開発者向け資料

- [開発・運用ガイド](docs/development-guide.md)：構成、実装ルール、検証・リリース手順
- [DB運用ガイド](docs/database-operations.md)：マイグレーション、RLS、権限付与
- [Googleログイン設定](docs/google-login.md)：OAuth・リダイレクトURL設定
- [SEO・広告ガイド](docs/seo-ads-guide.md)：Search Console・AdSense運用
