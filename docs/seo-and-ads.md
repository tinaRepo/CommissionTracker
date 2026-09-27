# SEO・Google AdSense 運用メモ

対象サイト: `https://commission-tracker-nine.vercel.app`

## 現在のSEO設定

- 共通metadataは`app/layout.tsx`、ページ固有のtitle・description・canonical・OG/Twitter情報は各公開ページの`layout.tsx`に設定する。
- 公開対象は`/lp`、`/pricing`、`/guide`、`/terms`、`/privacy`、`/tokusho`。
- `/sitemap.xml`は`app/sitemap.ts`から生成する。実際に検索対象にしたい公開ページだけを掲載し、ログイン後アプリの`/`は含めない。
- `public/robots.txt`でサイトマップを案内し、ログイン、管理、パスワード設定、メンテナンス等のURLをクロール対象から除外する。
- ログイン・管理者・パスワード設定・メンテナンスなどのページは`robots: noindex, nofollow`を設定する。
- SEO用のURL・metadataを変更する場合は、`lib/seo.ts`、各ページのlayout、`app/sitemap.ts`、`public/robots.txt`をまとめて確認する。

### Google Search Console

1. Search ConsoleでURLプレフィックス`https://commission-tracker-nine.vercel.app/`を追加する。Vercelの共有サブドメインはDNSゾーンを直接管理できないため、DNS TXTで確認するドメインプロパティではなくURLプレフィックスを使う。
2. 所有権確認方法にHTMLタグを選び、提示されたmetaタグの`content`値を取得する。値は公開リポジトリにコミットしない。
3. デプロイ後に`app/layout.tsx`のmetadataへ`verification: { google: "取得したcontent値" }`を追加し、再デプロイする。確認完了後もタグは残しておく。
4. **サイトマップ**画面で`https://commission-tracker-nine.vercel.app/sitemap.xml`を送信する。
5. URL検査で`/lp`などの公開ページを調べ、Googleが取得したcanonicalが意図したURLであることを確認する。公開・更新直後は必要に応じてインデックス登録をリクエストする。
6. インデックス登録、クロールエラー、Core Web Vitalsを定期確認する。登録リクエストは即時掲載や順位向上を保証するものではない。

### robots.txtとnoindexの注意

現在は`robots.txt`で一部の非公開ルートをDisallowし、同じルートにはnoindex metadataも付けている。GoogleはDisallowされたURLの内容をクロールできないため、既に検索結果に載ったURLを確実に削除したい場合は、robots.txtで遮断したままにせず、まずクロールを許可してnoindexを読み取らせる必要がある。robots設定を変更した場合はSearch Consoleのrobots.txtテスター／URL検査で確認する。

## AdSense

- AdSense publisher ID: `pub-4461599437148086`。
- AdSense loaderは`app/layout.tsx`の`<head>`内に通常の`<script async>`として配置している。`next/script`を使うとNext.jsが`data-nscript`属性を付与し、AdSenseから「head tag doesn't support data-nscript attribute」という警告が出る環境があるため、このloaderはNext.js Scriptに戻さない。
- 所有サイトの確認と広告配信の状態はAdSense管理画面で確認する。README上の審査状態は、審査完了後に実際の状態へ更新する。
- `public/ads.txt`には次の認定販売者レコードを置いている。publisher IDをAdSense側で変更した場合は必ず同期する。

```text
google.com, pub-4461599437148086, DIRECT, f08c47fec0942fa0
```

- 公開後、`https://commission-tracker-nine.vercel.app/ads.txt`がHTTP 200で取得でき、内容がAdSense管理画面の指定と一致することを確認する。
- 広告タグを追加するときは、広告を表示する公開ページへ必要な広告ユニットを配置する。loaderを読み込んだだけでは広告枠が表示されるとは限らない。

## Webアプリ用metaとコンソール警告

- `appleWebApp.capable`はiOSのホーム画面追加動作との互換性のため維持する。
- `mobile-web-app-capable=yes`も追加しており、ブラウザーが案内する標準metaを併記している。Apple用metaを削るとiOS PWAの表示に影響する可能性があるため、警告だけを理由に削除しない。
- 広告タグやmetadataを変更した後は、ブラウザー開発者ツールでheadの出力、コンソール、広告・PWAの動作を確認する。