# Supabase マイグレーション運用ガイド

## 概要

本プロジェクトでは、データベース変更履歴を管理するために Supabase Migration を利用しています。

今後テーブル作成やカラム追加を行う場合は、必ずマイグレーションファイルを作成して変更を適用してください。

本ガイドは Supabase CLI v2.104.0 を前提としています。

---

# マイグレーションとは

マイグレーションとは、データベースの変更履歴をコードとして管理する仕組みです。

例えば以下のような変更を記録できます。

* テーブル作成
* カラム追加
* カラム削除
* インデックス追加
* View作成
* Function作成

## 悪い例

Supabase Dashboardから直接SQLを実行する

```sql
ALTER TABLE commissions ADD COLUMN due_date DATE;
```

変更履歴が残らず、他の開発者が追跡できません。

## 良い例

マイグレーションファイルとして保存する

```text
supabase/migrations/
└── 20260606153000_add_due_date.sql
```

```sql
ALTER TABLE commissions ADD COLUMN due_date DATE;
```

Git管理できるため、誰がいつ何を変更したか分かります。

---

# ローカルDBと本番DBの違い

Supabaseには大きく分けて2種類のDBがあります。

## ローカルDB

Docker上で起動する開発用DBです。

```text
開発者PC
↓
Docker
↓
Local Supabase
```

ローカルDBへの適用は主に以下を使用します。
以下は、テーブルをリセットして作り直します。

```bash
npx supabase db reset
```
以下は、未適用だけ適用させます。
```bash
npx supabase migration up
```

---

## 本番DB（Supabase Cloud）

SupabaseがホストしているクラウドDBです。

```text
Supabase Cloud
↓
Production Database
```

本番DBへの適用は以下を使用します。

```bash
npx supabase db push
```

---

# 初回セットアップ

## 1. Supabase CLIインストール

```bash
npm install supabase --save-dev
```

または

```bash
npm install -g supabase
```

バージョン確認

```bash
npx supabase --version
```

---

## 2. プロジェクト初期化

初回のみ実行

```bash
npx supabase init
```

作成されるディレクトリ

```text
supabase/
├── config.toml
├── migrations/
└── seed.sql
```

---

## 3. ローカル環境起動

Docker Desktopを起動した状態で実行

```bash
npx supabase start
```

起動後

```text
API URL
DB URL
Studio URL
```

が表示されます。

Studioは通常以下でアクセス可能です。

```text
http://localhost:54323
```

---

## 4. ログイン

初回のみ実行

```bash
npx supabase login
```

ブラウザが開くので認証してください。

※ 毎回ログインする必要はありません。

---

## 5. プロジェクト接続

Supabase Dashboardから Project Ref を確認します。

```text
Project Settings
↓
General
↓
Reference ID
```

接続

```bash
npx supabase link --project-ref <project-ref>
```

例

```bash
npx supabase link --project-ref abcdefghijklmnop
```

---

# マイグレーション作成

新しいDB変更を行う場合

```bash
npx supabase migration new add_due_date
```

作成されるファイル

```text
supabase/migrations/
└── 20260606153000_add_due_date.sql
```

中にSQLを記載します。

```sql
ALTER TABLE commissions
ADD COLUMN due_date DATE;
```

---

# ローカルDBへ適用

## 推奨

以下は、テーブルをリセットして作り直します。
```bash
npx supabase db reset
```

以下は、未適用だけ適用させます。
```bash
npx supabase migration up
```

実行内容

1. ローカルDB削除
2. ローカルDB再作成
3. migration全実行
4. seed.sql実行

開発中は基本的にこのコマンドを利用します。

---

# 本番DBへ適用

## 事前確認

```bash
npx supabase db push --dry-run
```

適用される内容を確認できます。

---

## 本番反映

```bash
npx supabase db push
```

未適用のマイグレーションのみ実行されます。

---

# 状態確認

```bash
npx supabase migration list
```

適用済み・未適用を確認できます。

---

# 既存環境の考え方

本プロジェクトでは、過去に手動実行したSQLが存在します。

そのため、既存SQLファイルを「適用済み」としてSupabaseへ登録しています。

---

# 適用済みとして登録する

例

```text
20260601000000_v1_0_0.sql
```

が既に本番へ適用済みの場合

```bash
npx supabase migration repair --status applied 20260601000000
```

これにより

```text
SQLを再実行しない
+
履歴のみ登録する
```

状態になります。

---

# 適用済みを取り消す

```bash
npx supabase migration repair --status reverted 20260601000000
```

---

# 既存DBからマイグレーション生成

既存のSupabase Cloudの状態を取得する場合

```bash
npx supabase db pull
```

実行するとマイグレーションファイルが生成されます。

---

# マイグレーションファイル命名規則

必ず以下の形式で作成してください。

```text
YYYYMMDDHHMMSS_説明.sql
```

例

```text
20260601000000_v1_0_0.sql
20260615000000_v1_1_0.sql
20260630000000_add_due_date.sql
```

---

# 注意事項

## 過去のマイグレーションは編集しない

適用済みマイグレーションは変更禁止です。

NG例

```text
20260601000000_v1_0_0.sql
```

を後から編集する。

理由：

既に本番へ適用済みのため履歴が壊れます。

---

## 修正が必要な場合

新しいマイグレーションを作成してください。

例

```text
20260601000000_v1_0_0.sql
20260615000000_add_due_date.sql
20260630000000_fix_due_date.sql
```

---

## Dashboardで直接変更しない

原則として本番環境で直接SQLを実行しないでください。

NG例

```text
Supabase Dashboard
↓
SQL Editor
↓
直接ALTER TABLE実行
```

理由：

* Git管理されない
* 履歴が残らない
* db push時に差分不整合が発生する

---

# login / logout について

通常は以下のみ実施します。

```bash
npx supabase login
```

ログイン状態は保存されます。

毎回

```bash
npx supabase logout
npx supabase login
```

を実施する必要はありません。

---

# よく使うコマンド一覧

## バージョン確認

```bash
npx supabase --version
```

## ローカル起動

```bash
npx supabase start
```

## ローカル停止

```bash
npx supabase stop
```

## ログイン

```bash
npx supabase login
```

## プロジェクト接続

```bash
npx supabase link --project-ref <project-ref>
```

## マイグレーション作成

```bash
npx supabase migration new <name>
```

## ローカル反映

```bash
npx supabase db reset
```

## 適用状況確認

```bash
npx supabase migration list
```

## 本番反映確認

```bash
npx supabase db push --dry-run
```

## 本番反映

```bash
npx supabase db push
```

## 現在のDB取得

```bash
npx supabase db pull
```

## 適用済み登録

```bash
npx supabase migration repair --status applied <timestamp>
```

## 適用済み解除

```bash
npx supabase migration repair --status reverted <timestamp>
```

---

# 推奨開発フロー

1. Issue作成

2. マイグレーション作成

```bash
npx supabase migration new add_xxx
```

3. SQL記述

4. ローカル反映

```bash
npx supabase db reset
```

5. 動作確認

6. 本番反映内容確認

```bash
npx supabase db push --dry-run
```

7. Gitコミット

8. Pull Request

9. マージ

10. 本番反映

```bash
npx supabase db push
```

以上が本プロジェクトの標準的なDB変更フローです。
