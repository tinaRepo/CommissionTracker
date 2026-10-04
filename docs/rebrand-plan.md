# 「ツクリスト」リブランディング計画（絵師向け→汎用納期管理）

version: 2.0.0 での対応。旧サービス名「Commission Tracker」を「ツクリスト」に変更し、
イラスト依頼に限定していた用語・DB構造を汎用的な納期・タスク管理向けに変更する。

## 1. サービス名

| 項目                       | 旧                                 | 新                                            |
| -------------------------- | ---------------------------------- | --------------------------------------------- |
| サービス名（日本語）       | Commission Tracker                 | **ツクリスト**                                |
| キャッチコピー例           | 絵の依頼を、もう迷子にしない。     | 納期を、もう迷子にしない。                    |
| ロゴ絵文字                 | 🎨                                  | 📋                                             |
| ドメイン（要Vercel側変更） | commission-tracker-nine.vercel.app | tsukurist（等、実際に取得したドメインに置換） |

> ⚠ ドメイン自体はVercel/DNS側の実設定が必要なため、コード上は`NEXT_PUBLIC_APP_URL`のプレースホルダーを
> `https://commission-tracker-nine.vercel.app`に変更した。実際のデプロイURLが確定したら
> `.env`・`app/layout.tsx`のmetadataBase・`lib/seo.ts`のSITE_URLを実URLに差し替えること。

## 2. 画面上の用語

| 旧                             | 新                     |
| ------------------------------ | ---------------------- |
| 絵師名                         | 依頼先名               |
| 絵師                           | 依頼先                 |
| X ID                           | SNS/連絡先（X ID等）   |
| ラフ確認中（ステータス）       | 確認中                 |
| ラフ提出日                     | 提出日                 |
| 画像タイプ「ラフ」             | 確認用                 |
| 画像タイプ「作業中」           | 制作中                 |
| 画像タイプ「完成」             | 完成（変更なし）       |
| 画像タイプ「その他」           | その他（変更なし）     |
| 「絵師・依頼する側」という表現 | 「作り手・依頼する側」 |

ステータス（依頼済み／確認中／制作中／完成／キャンセル）・画像タイプ（確認用／制作中／完成／その他）は
イラスト以外（デザイン、執筆、外注全般、システム開発の下請け発注など）でも通用する語として選定した。

## 3. DBスキーマの変更（`20260928000000_V2.0.0_rebrand_to_tasks.sql`）

| 種別                  | 旧                  | 新                          |
| --------------------- | ------------------- | --------------------------- |
| テーブル              | `commissions`       | `tasks`                     |
| テーブル              | `commission_images` | `task_images`               |
| カラム（tasks）       | `artist`            | `assignee_name`（依頼先名） |
| カラム（tasks）       | `x_id`              | `contact`（SNS/連絡先）     |
| カラム（tasks）       | `rough_date`        | `submission_date`（提出日） |
| カラム（task_images） | `commission_id`     | `task_id`                   |
| ステータス値          | `rough`             | `checking`                  |
| 画像タイプ値          | `rough`             | `preview`                   |
| Storageバケット       | `commission-images` | `task-images`               |

`title` / `ordered_at` / `deadline` / `price` / `currency` / `notes` / `status`（値`pending`/`progress`/`done`/`cancelled`）/
画像タイプの`wip`/`finished`/`other`は元々汎用的なため変更していない。

### Storageバケットの移行に関する注意

Supabase Storageはバケット名を直接renameできないため、マイグレーションでは
`task-images`という新バケットを作成しRLSポリシーを新設するに留めている。
既存の`commission-images`バケット内のファイルは自動移行されないため、
本番適用前に以下のいずれかの方法で必ずオブジェクトをコピーすること。

```bash
# 例: Supabase CLIやスクリプトでバケット間コピーを行う
# 1. commission-images 配下のオブジェクト一覧を取得
# 2. 各オブジェクトを task-images へ copy
# 3. task_images.storage_path を新パスに更新（パス構造が同じなら不要）
# 4. 移行確認後、旧 commission-images バケットを削除
```

`storage_path`のパス構造自体（`{user_id}/{task_id}/{type}_{timestamp}.{ext}`）は変更していないため、
オブジェクトを新バケットへコピーするだけでDB側の`storage_path`は書き換え不要。

## 4. コード側の対応状況

### 新規・書き換え済み（本セッション）

- `supabase/migrations/20260928000000_V2.0.0_rebrand_to_tasks.sql`（新規）
- `lib/supabase.ts`、`lib/seo.ts`
- `components/TaskApp.tsx`（旧 CommissionApp）、`TaskShared.tsx`（旧 CommissionShared）、`TaskSearchBar.tsx`（旧 CommissionSearchBar）、`DemoApp.tsx`、`SystemMessage.tsx`
- `hooks/useTaskSearch.ts`（旧 useCommissionSearch）
- `app/page.tsx`、`app/layout.tsx`、各`layout.tsx`（lp/guide/terms/privacy/tokusho/pricing/login/update-password/forbidden/maintenance/mgmt）
- `app/lp|guide|terms|privacy|tokusho|login|maintenance`の`page.tsx`
- `app/api/cron/deadline-notify`・`request-delete`・`contact`の`route.ts`
- `public/manifest.json`・`sw.js`・`offline.html`
- `docs/handover.md`・`docs/rebrand-plan.md`・`README.md`

### 変更不要（確認済み）

`app/pricing/page.tsx`、`app/mgmt-c7f2a91e/page.tsx`、`components/AdminNotificationsPage.tsx`、
`app/api/stripe/*`、`app/api/admin/*`、`app/api/push/*`、`middleware.ts`、`hooks/useNotifications.ts`
等は、ブランド名・旧カラム名を参照していないためそのまま利用できる。

### リポジトリ側で削除するファイル

`components/CommissionApp.tsx` / `CommissionShared.tsx` / `CommissionSearchBar.tsx` / `hooks/useCommissionSearch.ts`
（`CommissionShared.tsx`内の未使用`CommissionCard`は移行していない）

## 5. 今後の対応予定（引き継ぎ事項）

- Resendを使ったSupabase Auth用SMTP設定（`docs/handover.md`のTODO参照、変更なし・継続）
- 上記「残タスク」の文言置換の完了
- 実ドメイン確定後の`NEXT_PUBLIC_APP_URL`・`metadataBase`・`SITE_URL`の更新
- Storageバケットのオブジェクト移行（`commission-images` → `task-images`）
