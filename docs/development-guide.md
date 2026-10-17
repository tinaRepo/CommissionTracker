# 開発ガイド

## サービスと構成

ツクリストは、依頼・タスクの納期、金額、確認用画像を管理するWebアプリです。

| 領域 | 主な技術 |
| --- | --- |
| アプリ | Next.js 14 (App Router)、React、TypeScript |
| DB・認証・画像 | Supabase |
| ホスティング・Cron | Vercel |
| 決済・メール・通知 | Stripe、Resend、Web Push |

主なコードの場所:

- `app/`: ページ、APIルート、メタデータ
- `components/`, `hooks/`: UI、共有フック
- `lib/supabase.ts`: Supabaseクライアント、型、データ操作
- `lib/server/`: service roleを使うサーバー専用処理
- `supabase/migrations/`: DB変更履歴
- `scripts/`: 一回限りのデータ移行などの運用スクリプト

詳細なセットアップは[README](../README.md)、DB変更は[DB運用ガイド](./database-operations.md)を参照してください。
Stripeのテスト・本番設定と課金挙動は[Stripe運用ガイド](./stripe-guide.md)、本番ドメインとメール設定は[独自ドメイン設定・移行ガイド](./domain-migration.md)を参照してください。

## ローカル開発と検証

```bash
npm install
npm run dev
```

必要な環境変数は `.env.example` を確認し、ローカル値は `.env.local` に設定します。秘密鍵や本番接続情報をコミットしないでください。

変更内容に応じて、コミット前に次のチェックを実行します。

```bash
npm run typecheck
npm run lint
npm run build
```

## 実装時の基本ルール

- DB変更は新しいSupabase migrationに記録し、適用済みmigrationは編集しない。
- クライアントからの入力はサーバー側でも検証する。service role keyや秘密情報をクライアントへ渡さない。
- ユーザーごとのデータはRLSで分離し、新規テーブル・関数は必要なロールだけに権限を付与する。
- 再利用するUI・検索条件・表示定数は既存の共有コンポーネントやフックを確認してから変更する。
- 色、角丸、影、タイポグラフィは `app/globals.css` のトークンを使い、画面間の一貫性を保つ。
- 画像URLは一括取得し、依存しない非同期処理は並列化する。不要な大容量クライアント処理を追加しない。

## リリースと変更履歴

バージョンを更新する場合は、作業をコミットしてから互換性への影響に基づき `npm version patch|minor|major` を使います。通常、このコマンドはコミットとGitタグも作成します。

コミットメッセージは変更目的が分かる短い形式にします（例: `feat: タスク検索を追加`、`fix: ログイン後の表示を修正`、`docs: 開発手順を整理`）。リリースのお知らせは管理画面から登録します。
