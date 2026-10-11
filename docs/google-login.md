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

## 動作確認

- 新しいGoogleアカウントで登録・ログインできる。
- 既存ユーザーがGoogleアカウントを連携・解除できる。
- リダイレクトエラーがなく、パスワード設定・リセットのリンクが正しく動作する。

主な実装箇所は `app/login/page.tsx`、`app/auth/callback/route.ts`、`lib/supabase.ts` です。
