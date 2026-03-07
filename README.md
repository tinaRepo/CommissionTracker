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

`supabase/schema.sql` の内容をSQL Editorに貼り付けて「Run」

#### ② RLSポリシーを正しく設定（必ずこちらを実行）

```sql
-- 既存ポリシーを全削除
drop policy if exists "profiles_select_own" on user_profiles;
drop policy if exists "profiles_select_admin" on user_profiles;
drop policy if exists "profiles_update_admin" on user_profiles;

-- 再帰しないセキュリティ定義関数を作成
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from user_profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- ポリシーを関数ベースで再作成
create policy "profiles_select_own" on user_profiles
  for select using (auth.uid() = id);

create policy "profiles_select_admin" on user_profiles
  for select using (is_admin());

create policy "profiles_update_admin" on user_profiles
  for update using (is_admin());
```

#### ③ signupトリガーを正しく作成

```sql
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

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
```

---

## 手順3: Vercel デプロイ

1. GitHubにpush
2. Vercel → Add New Project → リポジトリを選択
3. **Environment Variables** に以下を追加：

| キー | 値 |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseのProject URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseのanon key |

4. Deploy → 完成！🎉

> ⚠️ 環境変数を追加・変更した後は必ず **Redeploy** すること

---

## 手順4: 管理者ユーザーの設定

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
