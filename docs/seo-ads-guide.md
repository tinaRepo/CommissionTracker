# SEO・広告ガイド

## SEO

- 共通metadataは `app/layout.tsx`、ページ固有のmetadataは各公開ページで設定します。
- 公開対象のURLは `app/sitemap.ts` に登録し、`public/robots.txt` のサイトマップURLと合わせます。ログイン後のアプリ画面は公開対象に含めません。
- URLや公開ページを変更した場合はmetadata、canonical、サイトマップ、robots.txtをまとめて確認します。
- Google Search Consoleには実サイトURLのURLプレフィックスを登録し、所有権を確認して `/sitemap.xml` を送信します。
- `robots.txt` でクロールを禁止したページは検索エンジンが `noindex` を確認できません。検索結果からの削除が必要な場合は、robots.txtの制限を一時的に見直してください。

## Google AdSense

- 広告スクリプトは公開コンテンツページだけに読み込みます。対象ページと読み込み制御は `components/AdSenseLoader.tsx` の `AD_ALLOWED_PATHS` が基準です。
- 所有確認用metaは広告スクリプトとは別に設定します。広告を出すページを追加するときは、コンテンツとAdSenseポリシーを確認してから対象に含めます。
- publisher IDを変更する場合は、コードと `public/ads.txt` の認定販売者レコードを合わせます。
- デプロイ後、Search ConsoleのURL検査、AdSenseの所有・配信状況、`/ads.txt` のHTTP 200を確認します。

広告タグやmetadataの変更後は、ブラウザーでhead出力、コンソール、広告の表示を確認してください。
