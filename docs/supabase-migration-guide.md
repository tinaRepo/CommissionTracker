# Supabase マイグレーション運用ガイド

## 概要

本プロジェクトでは、データベース変更履歴を管理するために Supabase Migration を利用しています。

今後テーブル作成やカラム追加を行う場合は、必ずマイグレーションファイルを作成して変更を適用してください。

本ガイドは Supabase CLI v2.104.0 を前提としています。

Supabaseの管理はSupabase CLIのコマンドで行います。検証DBと本番DBのProject Refを指定して、マイグレーションの作成・確認・適用を実行します。

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

# 検証DBと本番DBの違い

Supabase Cloudは、検証用と本番用の2つのプロジェクトに分けて運用します。

---

## 検証DB（Supabase Cloud）

検証用のSupabaseプロジェクトがホストしているクラウドDBです。本番データとは分離し、リリース前の動作確認に使用します。

```text
Supabase Cloud
↓
Staging Database
```

検証DBへの適用は、必ず検証用Project Refを指定して実行します。

```bash
npx supabase db push --project-ref <staging-project-ref>
```

---

## 本番DB（Supabase Cloud）

本番用のSupabaseプロジェクトがホストしているクラウドDBです。

```text
Supabase Cloud
↓
Production Database
```

本番DBへの適用は、必ず本番用Project Refを指定して実行します。

```bash
npx supabase db push --project-ref <production-project-ref>
```

検証DBと本番DBは別プロジェクトのため、Project Refを取り違えないでください。

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

## 3. ログイン

初回のみ実行

```bash
npx supabase login
```

ブラウザが開くので認証してください。



## 4. Supabaseプロジェクトの確認

Supabase Dashboardから、検証用と本番用のProject Refをそれぞれ確認します。

```text
Project Settings
↓
General
↓
Reference ID
```

例

```bash
npx supabase link --project-ref <staging-project-ref>
```

このコマンドを実行すると、Supabase CLIが検証用プロジェクトにリンクされます。本番用へ切り替える場合は、本番用Project Refを指定して再実行します。

```bash
npx supabase link --project-ref <production-project-ref>
```

ただし、リンク状態だけに依存せず、Cloudへの操作では常に対象のProject Refをコマンドに指定してください。

アプリの環境変数も、デプロイ先に応じて対応するSupabaseプロジェクトの値を設定します。

| デプロイ先 | Supabaseプロジェクト | 設定する値 |
| --- | --- | --- |
| 検証環境 | 検証用プロジェクト | 検証用のURL・anon key・service role key |
| 本番環境 | 本番用プロジェクト | 本番用のURL・anon key・service role key |

検証用と本番用で、認証設定、Storage、Edge Functions、WebhookなどのSupabase側設定も別々に管理します。

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
# 検証DBへ適用

## 事前確認

```bash
npx supabase db push --project-ref <staging-project-ref> --dry-run
```

適用される内容を確認できます。

---
## 検証反映

```bash
npx supabase db push --project-ref <staging-project-ref>
```

未適用のマイグレーションのみ実行されます。

---
# 本番DBへ適用

検証DBで動作確認が完了し、Pull Requestがマージされた後に本番DBへ適用します。

## 事前確認

```bash
npx supabase db push --project-ref <production-project-ref> --dry-run
```

本番に適用される内容を確認し、対象Project Refが本番用であることを確認してください。

## 本番反映

```bash
npx supabase db push --project-ref <production-project-ref>
```

未適用のマイグレーションのみ実行されます。

---
# 状態確認

```bash
npx supabase migration list --project-ref <staging-project-ref>
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
npx supabase migration repair --status applied 20260601000000 --project-ref <production-project-ref>
```

これにより

```text
SQLを再実行しない
+
履歴のみ登録する
```

状態になります。


# 適用済みを取り消す

```bash
npx supabase migration repair --status reverted 20260601000000 --project-ref <production-project-ref>
```


# 既存DBからマイグレーション生成

既存のSupabase Cloudの状態を取得する場合は、対象環境のProject Refを指定します。

```bash
npx supabase db pull --project-ref <staging-project-ref>
```

実行するとマイグレーションファイルが生成されます。


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


## 修正が必要な場合

新しいマイグレーションを作成してください。

例

```text
20260601000000_v1_0_0.sql
20260615000000_add_due_date.sql
20260630000000_fix_due_date.sql
```


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


# よく使うコマンド一覧

## バージョン確認

```bash
npx supabase --version
```

## ログイン

```bash
npx supabase login
```

## プロジェクト接続

```bash
npx supabase link --project-ref <staging-project-ref>
```

本番用へ切り替える場合は、以下を実行します。

```bash
npx supabase link --project-ref <production-project-ref>
```

## マイグレーション作成

```bash
npx supabase migration new <name>
```

## 検証DBの適用状況確認

```bash
npx supabase migration list --project-ref <staging-project-ref>
```

## 検証反映確認

```bash
npx supabase db push --project-ref <staging-project-ref> --dry-run
```

## 検証反映

```bash
npx supabase db push --project-ref <staging-project-ref>
```

## 本番反映確認

```bash
npx supabase db push --project-ref <production-project-ref> --dry-run
```

## 本番反映

```bash
npx supabase db push --project-ref <production-project-ref>
```

## 現在のDB取得

```bash
npx supabase db pull --project-ref <staging-project-ref>
```

本番DBの状態を取得する場合は、対象を本番用に変更します。

```bash
npx supabase db pull --project-ref <production-project-ref>
```

## 適用済み登録

```bash
npx supabase migration repair --status applied <timestamp> --project-ref <production-project-ref>
```

## 適用済み解除

```bash
npx supabase migration repair --status reverted <timestamp> --project-ref <production-project-ref>
```


# 推奨開発フロー

1. Issue作成

2. マイグレーション作成

```bash
npx supabase migration new add_xxx
```

3. SQL記述

4. 検証DBへの反映内容確認

```bash
npx supabase db push --project-ref <staging-project-ref> --dry-run
```

5. 検証DBへ反映

```bash
npx supabase db push --project-ref <staging-project-ref>
```

6. 検証環境で動作確認

7. Gitコミット

8. Pull Request

9. マージ

10. 本番反映内容確認

```bash
npx supabase db push --project-ref <production-project-ref> --dry-run
```

11. 本番反映

```bash
npx supabase db push --project-ref <production-project-ref>
```

以上が本プロジェクトの標準的なDB変更フローです。
