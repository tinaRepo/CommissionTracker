# 🎨 Commission Tracker - セットアップガイド

絵の依頼管理Webアプリ。Next.js + Supabase + Vercel構成です。

## プラン制限

| プラン | 画像保存（アカウント合計） |
|--------|--------------------------|
| 無料         | 10枚まで |
| スタンダード  | 50枚まで |
| プレミアム   | 無制限   |

---

## 手順1: Supabase セットアップ

### 1-1. プロジェクト作成
https://supabase.com → New project

### 1-2. テーブル・RLS・Storageを作成
Dashboard → SQL Editor → 以下を**順番に**実行してください。

#### ① テーブル作成（schema.sql の内容を貼り付けて実行）

#### ② RLSポリシー,signupトリガーを正しく作成（policy.sql　の内容を張り付けて実行）

### 1-3. Authentication設定
Dashboard → Authentication → Providers で有効化：
- **Email** → デフォルトで有効（Confirm emailはオフ推奨）
- **Google** → Google Cloud ConsoleでOAuthアプリを作成してClient ID/Secretを設定
- **Twitter(X)** → Twitter Developer PortalでOAuth2アプリを作成して設定

各OAuthの「Redirect URL」: `https://your-project.supabase.co/auth/v1/callback`

### 1-4. URL Configurationを設定
Dashboard → Authentication → URL Configuration：
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/**`

### 1-5. APIキーをメモ
Dashboard → Project Settings → Data API：
- `Project URL` → NEXT_PUBLIC_SUPABASE_URL
- `anon public` key → NEXT_PUBLIC_SUPABASE_ANON_KEY

---

## 手順2: ローカル確認（任意）

毎回コミット → デプロイしなくても、`vercel dev` を使えばローカルでAPIもフロントも動作確認できます。

### 初回セットアップ（1回だけ）

**① Vercel CLIをインストール**

```bash
npm i -g vercel
```

**② 依存パッケージをインストール**

```bash
npm install
```

**③ プロジェクトをVercelと紐付け**

```bash
vercel link
```

ブラウザが開いてVercelにログインを求められます。ログイン後、対象プロジェクトを選択してください。

**④ 環境変数をローカルに取得**

```bash
vercel env pull .env.local
```

Vercelに設定済みの環境変数が `.env.local` に自動で書き出されます。手入力不要です。

**⑤ `.gitignore` に `.env.local` を追加**

```bash
echo ".env.local" >> .gitignore
```

> ⚠️ `.env.local` には本番DBの接続情報が含まれるため、絶対にコミットしないでください。

---

### 毎回の起動

```bash
vercel dev
```

`http://localhost:3000` でアプリが起動します。HTMLもAPIも全てローカルで動作します。

---

## 手順3: Vercel デプロイ

1. GitHubにpush
2. Vercel → Add New Project → リポジトリを選択
3. **Environment Variables** に以下を追加：

| キー | 値 |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseのProject URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseのanon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role` ⚠️ 絶対に公開しないこと |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのservice_role key |
| `RESEND_API_KEY` | ResendのAPIキー |
| `ADMIN_EMAIL` | 削除申請メールの送信先アドレス |
| `NEXT_PUBLIC_APP_URL` | VercelのデプロイURL（例: https://your-app.vercel.app） |

4. Deploy → 完成！🎉

> ⚠️ 環境変数を追加・変更した後は必ず **Redeploy** すること

---

## 手順4: Resend セットアップ（メール送信）

ユーザーからのアカウント削除申請をメールで受け取るために設定します。

1. https://resend.com でアカウント作成（無料・月3,000通まで）
2. Dashboard → API Keys → **Create API Key**
3. 作成したAPIキーを `RESEND_API_KEY` としてVercelの環境変数に追加
4. `ADMIN_EMAIL` に削除申請を受け取りたいメールアドレスを設定

> ⚠️ 無料プランでは **Resendが発行したドメイン（onboarding@resend.dev）** からの送信のみ可能です。
> 独自ドメインで送信したい場合はDNS設定が必要です（任意）。

---

## 手順5: 管理者ユーザーの設定

1. アプリにアクセスして**新規登録**する
2. Supabase → Authentication → Users から自分のUUIDをコピー
3. SQL Editorで以下を実行：

```sql
update user_profiles set is_admin = true
where id = 'ここに自分のUUIDを貼る';
```

4. ログイン後、右上のユーザーメニュー → **「⚙ 管理者ページ」** から管理画面へ

---

## 機能一覧

- ✅ メール/パスワード・Google・Xログイン
- ✅ パスワードリセット（メール送信）
- ✅ ユーザーごとにデータが完全分離（RLS）
- ✅ 依頼の登録・編集・削除
- ✅ ステータス管理（依頼済み/ラフ確認中/制作中/完成/キャンセル）
- ✅ ラフ・完成画像のアップロード（Supabase Storage）
- ✅ 画像の拡大プレビュー・削除
- ✅ プランごとの画像枚数制限（無料10枚/スタンダード50枚/プレミアム無制限）
- ✅ 納期7日前の警告表示
- ✅ ステータスフィルタリング
- ✅ 管理者ページでユーザーのプラン変更
