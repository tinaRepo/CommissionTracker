# モノレポ移行メモ

## 概要

Turborepo + pnpm によるモノレポ構成への移行に伴い、  
Vercel・外部サービスの設定変更が必要になる。  
**本番環境への適用は全フェーズの移行完了後に実施すること。**

---

## ⚠️ 移行完了後にやること

### 1. Vercel：Root Directoryの変更

**Settings → General → Root Directory**

```
変更前: （なし / リポジトリルート）
変更後: apps/web
```

**Build & Development Settings（あわせて確認）**

| 項目             | 値             |
| ---------------- | -------------- |
| Build Command    | `next build`   |
| Output Directory | `.next`        |
| Install Command  | `pnpm install` |

設定保存後、**Redeploy** を実行する。

---

### 2. 環境変数の確認

モノレポ移行後も環境変数の内容自体は変わらない。  
Redeployのタイミングで念のため全項目を確認すること。

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
ADMIN_EMAIL=

# アプリURL
NEXT_PUBLIC_APP_URL=https://commission-tracker-nine.vercel.app

# Stripe
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
VAPID_EMAIL=
CRON_SECRET=
```

---

### 3. 動作確認チェックリスト

Redeploy完了後、以下をすべて確認してからリリースとする。

- [ ] ログインできる（メール・Google）
- [ ] 依頼一覧が表示される
- [ ] 依頼の登録・編集・削除ができる
- [ ] 画像アップロードができる
- [ ] Stripeの課金ページが開く
- [ ] プッシュ通知が動く
- [ ] 管理者ページにアクセスできる
- [ ] お問い合わせメールが届く
- [ ] Cron Job（納期通知）が動く

---

## 移行フェーズ進捗

| フェーズ | 内容                                          | 状態     |
| -------- | --------------------------------------------- | -------- |
| 1        | モノレポ基盤構築・apps/web/ 移動              | ✅ 完了   |
| 2        | packages/types/ 作成                          | ✅ 完了   |
| 3        | packages/supabase/ 作成                       | ✅ 完了   |
| 4        | packages/hooks/ 作成                          | ✅ 完了   |
| 5        | apps/web/ 整備（packages/への切り替え）       | ✅ 完了   |
| 6        | apps/mobile/ 構築（Expo）・主要機能実装       | ✅ 完了   |
| 7        | apps/mobile/ npm→pnpm統一                     | ✅ 完了   |
| 8        | apps/mobile/ 残機能実装（認証・通知・課金等） | 🔲 未着手 |
| 9        | CI/CD・Vercel本番適用                         | 🔲 未着手 |

---

## apps/mobile/ 実装状況

| 画面・機能                       | 状態     |
| -------------------------------- | -------- |
| ログイン・新規登録・リセット     | ✅ 完了   |
| 依頼一覧（サムネイル付き）       | ✅ 完了   |
| 依頼詳細（モーダル形式）         | ✅ 完了   |
| 依頼新規登録                     | ✅ 完了   |
| 依頼編集                         | ✅ 完了   |
| 依頼削除                         | ✅ 完了   |
| 画像アップロード・表示           | ✅ 完了   |
| 画像プレビュー・ギャラリーDL     | ✅ 完了   |
| 画像削除（遅延削除方式）         | ✅ 完了   |
| 日付ピッカー（日本語カレンダー） | ✅ 完了   |
| Google認証                       | 🔲 未着手 |
| プッシュ通知                     | 🔲 未着手 |
| お知らせ・バージョン情報         | 🔲 未着手 |
| お問い合わせ                     | 🔲 未着手 |
| プラン・課金                     | 🔲 未着手 |
| 管理者ページ                     | 🔲 未着手 |

---

## apps/mobile/ パッケージ管理：npm → pnpm 統一（完了）

### 経緯
- 当初pnpmでAndroid APKビルドができず、npm独立構成（`lib/packages/` に手動コピー）で運用していた
- 原因はWindows特有の**パスの長さ制限**であり、pnpmの仕組み自体の問題ではないことが判明
- パスを短くしたところ `npx expo run:android` でのビルドが成功したため、pnpmへの統一を再開
- 統一作業中に発生した `ERR_PNPM_ENOENT` / `EPERM` 系エラーは、最終的に**作業ドライブのフォーマット不良**が原因と判明（`D:` → `C:` に作業場所を移して解決）

### 統一後の構成
```
apps/mobile/package.json
  └─ dependencies に @commission-tracker/types・supabase・hooks を workspace:* で追加

packages/supabase/
  ├─ src/client.ts        # Web用（@supabase/ssr の createBrowserClient）
  ├─ src/client.native.ts # モバイル用（@supabase/supabase-js を直接使用）★新規追加
  └─ package.json
       exports:
         "."        → ./src/index.ts
         "./native" → ./src/client.native.ts

apps/mobile/lib/supabase.ts
  └─ import { createClient } from '@commission-tracker/supabase/native';
```

`apps/mobile/lib/packages/`（手動コピー）と `scripts/sync-packages.js` は削除済み。
全コンポーネント・画面の import を `../lib/packages/*` から `@commission-tracker/*` に置き換え済み。

### 注意点
- リポジトリの配置パスは極力短くする（例: `C:\CT` 程度）。長いパス＋pnpmのシンボリックリンク構造でWindowsの260文字制限に達するとAndroidビルドが失敗する
- 作業ドライブ自体のフォーマット異常もシンボリックリンク関連のエラー（`ERR_PNPM_ENOENT`, `EPERM`）として現れることがある。同種のエラーが解消しない場合はドライブ自体も疑うこと
- Webとモバイルで異なるSupabaseクライアント実装が必要な場合は、`package.json` の `exports` でエントリポイントを分岐させる方法が有効（`client.ts` と `client.native.ts` の使い分け）

---

## apps/mobile/ 技術メモ

- **Supabaseクライアント**: `@supabase/supabase-js` を直接使用（`@supabase/ssr` の `createBrowserClient` はブラウザCookie依存のためReact Native非対応）
- **画像アップロード**: `expo-file-system/legacy` で base64読み込み → `Uint8Array` 変換 → Supabase Storageへアップロード
  - `fetch().blob()` → `StorageUnknownError: Unsupported FormDataPart implementation` エラーで失敗
  - `FormData` → 同様に失敗
  - `ArrayBuffer` → アップロードは成功するが画像が破損
  - **base64 + Uint8Array が唯一安定して動作した方法**
- **画像ダウンロード**: `expo-media-library/legacy` でギャラリーに保存
  - `expo-media-library`（新API）は `ExpoMediaLibraryNext` ネイティブモジュール未対応でExpo Goでは動作しない
  - `npx expo run:android` でのネイティブビルドが必須
  - 新APIの `saveToLibraryAsync` は legacy版へのimport変更で解決
- **Modalネスト問題**: Android実機/エミュレータでは `Modal` を別の `Modal` の中に配置すると `addViewAt: failed to insert view` エラーが発生する
  - 画像プレビューのModalは詳細モーダル（`CommissionDetailModal`）と**兄弟要素**として配置し直すことで解決
  - 同様に一覧画面（`home.tsx`）でも、`CommissionDetailModal` をルートの`View`の中ではなく `<>...</>` フラグメントで外に出す必要がある
- **日付ピッカー**: `react-native-modal-datetime-picker` + `@react-native-community/datetimepicker`。Android端末の言語設定が日本語であれば自動で日本語カレンダー表示になる
- **ルーティング**: Expo Router（ファイルベース）。`commission/_layout.tsx` の配置を忘れるとネストルートで警告が出る
- **カードレイアウト**: サムネイル画像は固定サイズ（72×72）+ `overflow: hidden` の専用Viewでラップし、カードの角丸（`borderRadius`）と統一すること。直接Imageに`borderRadius`を付けるとAndroidで描画が崩れる場合がある

---

## 備考

- フェーズ1〜6完了時点で実機・エミュレータ動作確認済み
- Vercel本番への適用はフェーズ9で実施
- `dev` ブランチで開発 → 全フェーズ完了後に `main` へマージ
- 本資料・`handover.md`・`README.md` は `docs/`（リポジトリルート直下）で管理する（旧 `apps/web/docs/` から移動済み）
