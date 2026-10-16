# Googleログイン設定

Google Cloud ConsoleとSupabase Dashboardの両方でOAuthを設定します。

## Google Cloud Console

1. **APIとサービス → 認証情報**でウェブアプリのOAuthクライアントを作成します。
2. 承認済みリダイレクトURIにSupabaseのCallback URLを登録します:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. 発行されたクライアントIDとシークレットを控えます。

`<project-ref>` はSupabase Dashboardの **Project Settings → General → Reference ID** で確認できます。

## Supabase Dashboard

1. **Authentication → Providers → Google**でプロバイダーを有効にし、OAuthクライアントIDとシークレットを設定します。
2. **Authentication → URL Configuration**のSite URLをアプリのURLに設定します。
3. Redirect URLsに次のURLを登録します（本番・検証環境の実URLへ置換）。
   - `https://<app-domain>/auth/callback`
   - `https://<app-domain>/auth/confirm`
4. アカウント連携を提供する場合は **Authentication → Sign In / Providers → Allow manual linking** を有効にします。
5. パスワード設定・リセットを使う場合は、**Authentication → Email Templates → Reset Password** のリンクが `/auth/confirm` に検証情報を渡すことを確認します。

テンプレートのリンク例:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">
  パスワードを設定・リセットする
</a>
```

`redirectTo` のURLがRedirect URLsに登録されていない場合、認証後にSite URLへ戻ることがあります。OAuth・連携・パスワードリセットに使う全URLを登録してください。

## アプリのドメインを変更するとき

アプリのドメインを変更したら、ログイン開始から認証コールバック、ログイン後の画面まで新しいドメインに統一してください。旧ドメインから新ドメインへ転送する構成では、旧ドメインで設定されたCookieは新ドメインへ引き継がれません。たとえば `ct_last_login_provider` が旧ドメインに保存されると、新ドメインのログイン画面で「前回ログイン」バッジを表示できません。

1. **Vercel**で新しいドメインをプロジェクトに割り当て、ログイン画面を新ドメインから開けることを確認します。ログイン開始に使うURLとOAuth後の戻り先を混在させないでください。
2. **Supabase Dashboard → Authentication → URL Configuration**でSite URLを新しいアプリドメインに変更し、Redirect URLsに少なくとも次を登録します。
   - `https://<new-app-domain>/auth/callback`
   - `https://<new-app-domain>/auth/confirm`
   - 必要な場合は、新ドメイン配下のVercel Preview URLも追加します。
3. **Google Cloud Console**の承認済みリダイレクトURIは、通常は変更不要です。Googleから最初に戻る先はアプリではなくSupabaseのCallback URL（`https://<project-ref>.supabase.co/auth/v1/callback`）です。Supabaseプロジェクトを変更した場合、またはSupabase Authの独自ドメインを使っている場合に限り、Google Cloud側のURIもSupabase Dashboardに表示される値へ更新します。
4. Vercelの`NEXT_PUBLIC_APP_URL`を新しいドメインに変更します。メール、プッシュ通知、課金後の戻り先などに使われます。
5. コード内の公開URLも確認します。`SITE_URL`の定義は`lib/site.ts`にあり、`lib/seo.ts`から再エクスポートされています。`app/layout.tsx`の`metadataBase`やサイトURLを直接記載しているページ・設定も新しいドメインに合わせます。
6. 新しいドメインでGoogleログインし、次を確認します。
   - OAuth完了後に新しいドメインの`/auth/callback`を経由してアプリへ戻る。
   - そのコールバック応答に`Set-Cookie: ct_last_login_provider=google`があり、続く`/api/auth/last-login-provider`の応答が`{"provider":"google"}`になる。
   - ログイン画面のGoogleボタンに「前回ログイン」バッジが表示される。

切り替え完了後は、不要になった旧ドメインのRedirect URLをSupabaseの許可リストから削除してください。独自ドメインの有効化前やDNS反映中に旧ドメインからログインを開始しないよう、案内リンク・ブックマーク・デプロイ先URLも確認します。

## 動作確認

- 新しいGoogleアカウントで登録・ログインできる。
- 既存ユーザーがGoogleアカウントを連携・解除できる。
- リダイレクトエラーがなく、パスワード設定・リセットのリンクが正しく動作する。

主な実装箇所は `app/login/page.tsx`、`app/auth/callback/route.ts`、`lib/supabase.ts` です。
