# Google ログイン設定ガイド

ツクリスト で Google ログイン（新規登録・ログイン・アカウント連携）を
有効にするための設定手順です。以下の2箇所での設定が必要です。

- **Google Cloud Console**：OAuthクライアントの作成
- **Supabase Dashboard**：Googleプロバイダーの有効化・URL設定・Manual Linkingの有効化

---

## 1. 自動的に決まる項目（コピーするだけでよい）

| 項目                  | 値                                                   | 使う場所                                         |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Supabase Callback URL | `https://<project-ref>.supabase.co/auth/v1/callback` | Google Cloud Console → 承認済みのリダイレクトURI |

`<project-ref>` は Supabase Dashboard → Project Settings → General → Reference ID で確認できます。

---

## 2. 手動で設定する項目

### 2-1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com) → 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuthクライアントID」→ アプリケーションの種類は「ウェブアプリケーション」
3. **承認済みのリダイレクトURI** に、上記の自動生成URLを貼り付け
4. 発行された **クライアントID** と **クライアントシークレット** を控える

### 2-2. Supabase Dashboard → Authentication → Providers

1. 「Google」を選択し有効化
2. クライアントID・シークレットを貼り付けて保存

### 2-3. Supabase Dashboard → Authentication → URL Configuration

| 項目          | 値                                                                                          | 備考                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Site URL      | `https://commission-tracker-nine.vercel.app`（実デプロイURLに置換）                                       | 本番/検証環境のURLに合わせる                                                           |
| Redirect URLs | `https://commission-tracker-nine.vercel.app/auth/callback`<br>`https://commission-tracker-nine.vercel.app/auth/confirm` | 個別指定の場合は両方登録すること。まとめて許可する場合はワイルドカード `.../**` でも可 |

> ⚠️ `redirectTo`に指定したURLがこのRedirect URLsに含まれていない場合、
> Supabaseはエラーを出さずに黙って`Site URL`へフォールバックし、
> 認証トークンがURLのハッシュフラグメントとして付与されます。
> `resetPasswordForEmail`や`signInWithOAuth`で使う`redirectTo`のパスは、
> 必ずこのRedirect URLsに事前登録すること。

### パスワード設定・リセットメールのテンプレート

Supabase Dashboard → **Authentication → Email Templates → Reset Password** のリンクは、
アプリの `/auth/confirm` に検証情報を渡す必要があります。

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">
	パスワードを設定・リセットする
</a>
```

### 2-4.【アカウント連携機能に必須】Manual Linking の有効化

1. Supabase Dashboard → **Authentication → Sign In / Providers**
2. 「**Allow manual linking**」をオンにする

### 2-5.【推奨】Automatic Linking の確認

Supabase Dashboard → Authentication → Sign In / Providers 内の
「Automatic Linking」も有効になっているか確認してください。

---

## 3. 動作確認チェックリスト

- [ ] ログイン画面から新規のGoogleアカウントでサインアップできる
- [ ] メール/パスワードで登録済みのユーザーが、ログイン後に「Googleと連携する」で連携できる
- [ ] 連携解除（`unlinkIdentity`）が動作する（パスワード未設定時は警告が出る仕様）
- [ ] Redirect URL不一致エラー（`redirect_uri_mismatch` 等）が出ないこと

---

## 4. 関連ファイル

- `app/login/page.tsx`：OAuthログインの呼び出し
- `app/auth/callback/route.ts`：OAuthコールバック処理（ログイン・連携共通）
- `lib/supabase.ts`：`linkGoogleAccount` / `unlinkGoogleAccount` / `hasGoogleIdentity`
- `components/TaskApp.tsx`：連携・解除・ログアウト時の警告UI
