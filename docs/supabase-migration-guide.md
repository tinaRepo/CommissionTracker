# Supabase マイグレーション運用ガイド

## 概要

本プロジェクトでは、データベース変更履歴を管理するために Supabase Migration を利用しています。

今後テーブル作成やカラム追加を行う場合は、必ずマイグレーションファイルを作成して変更を適用してください。

本ガイドは Supabase CLI v2.104.0 を前提としています。

Supabaseの管理はSupabase CLIのコマンドで行います。検証DBと本番DBのProject Refを指定して、マイグレーションの作成・確認・適用を実行します。

---

# マイグレーションとは

マイグレーションとは、データベースの変更履歴をコードとして管理する仕組みです。

## 悪い例

Supabase Dashboardから直接SQLを実行する

```sql
ALTER TABLE tasks ADD COLUMN due_date DATE;
```

変更履歴が残らず、他の開発者が追跡できません。

## 良い例

マイグレーションファイルとして保存する

```text
supabase/migrations/
└── 20260606153000_add_due_date.sql
```

```sql
ALTER TABLE tasks ADD COLUMN due_date DATE;
```

Git管理できるため、誰がいつ何を変更したか分かります。

---

# 検証DBと本番DBの違い

Supabase Cloudは、検証用と本番用の2つのプロジェクトに分けて運用します。

## 検証DB（Supabase Cloud）

```bash
npx supabase db push --project-ref <staging-project-ref>
```

## 本番DB（Supabase Cloud）

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

## 2. プロジェクト初期化

```bash
npx supabase init
```

## 3. ログイン

```bash
npx supabase login
```

## 4. Supabaseプロジェクトの確認

```bash
npx supabase link --project-ref <staging-project-ref>
```

本番用へ切り替える場合は、本番用Project Refを指定して再実行します。

```bash
npx supabase link --project-ref <production-project-ref>
```

アプリの環境変数も、デプロイ先に応じて対応するSupabaseプロジェクトの値を設定します。

---
# マイグレーション作成

```bash
npx supabase migration new add_due_date
```

```sql
ALTER TABLE tasks
ADD COLUMN due_date DATE;
```

---
# 検証DBへ適用

```bash
npx supabase db push --project-ref <staging-project-ref> --dry-run
npx supabase db push --project-ref <staging-project-ref>
```

---
# 本番DBへ適用

検証DBで動作確認が完了し、Pull Requestがマージされた後に本番DBへ適用します。

```bash
npx supabase db push --project-ref <production-project-ref> --dry-run
npx supabase db push --project-ref <production-project-ref>
```

---
# 状態確認

```bash
npx supabase migration list --project-ref <staging-project-ref>
```

---
# 既存環境の考え方

本プロジェクトでは、過去に手動実行したSQLが存在します。既存SQLファイルを「適用済み」としてSupabaseへ登録しています。

```bash
npx supabase migration repair --status applied <timestamp> --project-ref <production-project-ref>
npx supabase migration repair --status reverted <timestamp> --project-ref <production-project-ref>
```

# 既存DBからマイグレーション生成

```bash
npx supabase db pull --project-ref <staging-project-ref>
```

# マイグレーションファイル命名規則

```text
YYYYMMDDHHMMSS_説明.sql
```

例

```text
20260601000000_v1_0_0.sql
20260928000000_V2.0.0_rebrand_to_tasks.sql
20260630000000_add_due_date.sql
```

# 注意事項

## 過去のマイグレーションは編集しない

適用済みマイグレーションは変更禁止です。修正が必要な場合は新しいマイグレーションを作成してください。

## Dashboardで直接変更しない

原則として本番環境で直接SQLを実行しないでください。

---

# login / logout について

```bash
npx supabase login
```

ログイン状態は保存されます。

---

# よく使うコマンド一覧

```bash
npx supabase --version
npx supabase login
npx supabase link --project-ref <staging-project-ref>
npx supabase migration new <name>
npx supabase migration list --project-ref <staging-project-ref>
npx supabase db push --project-ref <staging-project-ref> --dry-run
npx supabase db push --project-ref <staging-project-ref>
npx supabase db push --project-ref <production-project-ref> --dry-run
npx supabase db push --project-ref <production-project-ref>
npx supabase db pull --project-ref <staging-project-ref>
npx supabase migration repair --status applied <timestamp> --project-ref <production-project-ref>
npx supabase migration repair --status reverted <timestamp> --project-ref <production-project-ref>
```

# 推奨開発フロー

1. Issue作成
2. マイグレーション作成（`npx supabase migration new add_xxx`）
3. SQL記述
4. 検証DBへの反映内容確認（`--dry-run`）
5. 検証DBへ反映
6. 検証環境で動作確認
7. Gitコミット
8. Pull Request → マージ
9. 本番反映内容確認（`--dry-run`）
10. 本番反映

以上が本プロジェクトの標準的なDB変更フローです。

> v2.0.0の`20260928000000_V2.0.0_rebrand_to_tasks.sql`は、テーブル・カラム名の変更に加えて
> Storageバケットの新設（`task-images`）を伴う。本番適用時は `docs/handover.md` の
> 「名称変更（v2.0.0）の適用手順」に従い、DB適用とコードデプロイを同時期に行うこと。
