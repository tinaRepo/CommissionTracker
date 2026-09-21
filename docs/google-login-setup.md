# Google ログイン設定ガイド

Commission Tracker で Google ログイン（新規登録・ログイン・アカウント連携）を
有効にするための設定手順です。以下の2箇所での設定が必要です。

- **Google Cloud Console**：OAuthクライアントの作成
- **Supabase Dashboard**：Googleプロバイダーの有効化・URL設定・Manual Linkingの有効化

---

## 1. 自動的に決まる項目（コピーするだけでよい）

Supabase側で自動生成され、変更できない値です。Google Cloud Console側の設定にそのまま貼り付けます。

| 項目                  | 値                                                   | 使う場所                                         |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Supabase Callback URL | `https://<project-ref>.supabase.co/auth/v1/callback` | Google Cloud Console → 承認済みのリダイレクトURI |

例：
```
https://endyhlszymdlxyrzdnwn.supabase.co/auth/v1/callback
```

`<project-ref>` は Supabase Dashboard → Project Settings → General → Reference ID で確認できます。

---

## 2. 手動で設定する項目

### 2-1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com) → 「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuthクライアントID」→ アプリケーションの種類は「ウェブアプリケーション」
3. **承認済みのリダイレクトURI** に、上記の自動生成URLを貼り付け
```
https://<project-ref>.supabase.co/auth/v1/callback
```


4. 発行された **クライアントID** と **クライアントシークレット** を控える

### 2-2. Supabase Dashboard → Authentication → Providers

1. 「Google」を選択し有効化
2. クライアントID・シークレットを貼り付けて保存

### 2-3. Supabase Dashboard → Authentication → URL Configuration

| 項目          | 値                                                                                                                        | 備考                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Site URL      | `https://commission-tracker-local.vercel.app`                                                                             | 本番/検証環境のURLに合わせる                                                                                                   |
| Redirect URLs | `https://commission-tracker-local.vercel.app/auth/callback`<br>`https://commission-tracker-local.vercel.app/auth/confirm` | 個別指定の場合は両方登録すること。まとめて許可する場合はワイルドカード `https://commission-tracker-local.vercel.app/**` でも可 |

> ⚠️ **重要**：`redirectTo`に指定したURLがこのRedirect URLsに含まれていない場合、
> Supabaseはエラーを出さずに黙って`Site URL`へフォールバックし、
> 認証トークンがURLのハッシュフラグメントとして付与されます。
> supabase-jsクライアントは`detectSessionInUrl`がデフォルト有効なため、
> このフォールバック先ページで意図せずセッションが自動確立され、
> 「パスワードリセットのつもりが、ただログインしただけになる」という
> 分かりにくい不具合につながります。`resetPasswordForEmail`や`signInWithOAuth`で
> 使う`redirectTo`/`redirectTo`のパスは、必ずこのRedirect URLsに事前登録すること。

### 2-4.【本アプリのアカウント連携機能に必須】Manual Linking の有効化

メール登録済みユーザーがログイン後にGoogleアカウントを連携する機能（`linkIdentity`）を使うために必要です。

1. Supabase Dashboard → **Authentication → Sign In / Providers**
2. 「**Allow manual linking**」（アカウントの手動リンクを許可）をオンにする

> この設定がオフのままだと、`supabase.auth.linkIdentity()` がエラーを返し、
> アプリ内の「Googleと連携する」ボタンが機能しません。

### 2-5.【推奨】Automatic Linking の確認

Google専用ユーザーがパスワードリセットフローでパスワードを設定した際に、
`auth.identities`へemail identityが正しくリンクされるよう、
Supabase Dashboard → Authentication → Sign In / Providers 内の
「Automatic Linking」（メールアドレスが一致し、かつ確認済みの場合に自動でアカウントを統合する設定）
も有効になっているか確認してください。Manual Linkingとは別設定です。

---

## 3. 動作確認チェックリスト

- [ ] ログイン画面から新規のGoogleアカウントでサインアップできる
- [ ] メール/パスワードで登録済みのユーザーが、ログイン後に「Googleと連携する」で連携できる
- [ ] 連携解除（`unlinkIdentity`）が動作する（本アプリではパスワード未設定時は警告が出る仕様）
- [ ] Redirect URL不一致エラー（`redirect_uri_mismatch` 等）が出ないこと

---

## 4. 関連ファイル

- `app/login/page.tsx`：OAuthログインの呼び出し
- `app/auth/callback/route.ts`：OAuthコールバック処理（ログイン・連携共通）
- `lib/supabase.ts`：`linkGoogleAccount` / `unlinkGoogleAccount` / `hasGoogleIdentity`
- `components/CommissionApp.tsx`：連携・解除・ログアウト時の警告UI