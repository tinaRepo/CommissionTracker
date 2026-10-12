# DB・データ運用ガイド

## マイグレーションの基本

DB変更は `supabase/migrations/` に追加し、Gitで履歴を管理します。適用済みのファイルは編集せず、修正用の新しいmigrationを作成してください。本番Dashboardでの直接変更は避けます。

```bash
npx supabase migration new add_example
npx supabase migration list --project-ref <staging-project-ref>
npx supabase db push --project-ref <staging-project-ref> --dry-run
npx supabase db push --project-ref <staging-project-ref>
```

検証環境で反映・動作確認し、変更をマージしてから本番でも `--dry-run` の内容を確認して適用します。検証用・本番用Project Refを取り違えないでください。

CLIの初期設定が必要な場合:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

既存環境のmigration履歴を修復する場合は、適用済み状態を確認してから `npx supabase migration repair` を使用します。DB状態を確認せずに `applied` / `reverted` を登録しないでください。

## RLSと権限付与

新しいテーブルはRLSを有効にし、必要なロールに必要な操作だけを付与します。ポリシーが行単位のアクセスを制限します。

```sql
alter table public.example enable row level security;
grant select, insert, update, delete on public.example to authenticated;
```

未ログインユーザーにも公開する必要があるデータだけ `anon` に付与します。サーバー専用テーブルは `anon` と `authenticated` の権限を取り消し、必要な操作だけを `service_role` に付与してください。RPC関数は不要な `PUBLIC` 実行権限を取り消します。

権限付与を忘れるとデータAPIが `permission denied`（42501）を返します。具体的な付与例は既存のmigrationで確認してください。

## Stripe Webhookの確認

Webhookの冪等性テーブル `public.stripe_events` は `20261006000000_V2.0.0_features.sql` で作成されます。Vercelが接続するSupabaseプロジェクトにこのmigrationが適用されていることを確認してください。

```sql
select to_regclass('public.stripe_events');
```

結果が `null` ならmigration未適用です。Stripe Dashboardの **Developers → Webhooks → 対象endpoint → Event deliveries** で配信結果を確認し、同時刻のVercel Function Logsも照合してください。Webhook署名の検証に失敗するとDB登録前に終了します。また、処理失敗時は再配信できるよう `stripe_events` の記録を削除するため、テーブルが空であることだけでは原因を特定できません。テスト環境と本番環境でWebhook endpoint secret・Stripe API key・Price IDを混在させないでください。

## Storageデータ移行

通常の開発でStorage移行スクリプトを実行する必要はありません。旧環境から画像を移す作業が必要な場合に限り、対象プロジェクトの環境変数を確認して実行します。

```bash
node --env-file=.env.local scripts/migrate-storage.mjs --dry-run
node --env-file=.env.local scripts/migrate-storage.mjs
```

画像の表示・アップロードを確認してから、旧バケットを削除する必要がある場合のみ `--cleanup --dry-run` で対象を確認し、その後 `--cleanup` を実行してください。クリーンアップは不可逆です。移行先に不足ファイルがある状態では実行しないでください。
