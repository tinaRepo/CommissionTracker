import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// パスワードの設定・変更（Admin API経由）
// 通常のsupabase.auth.updateUser({password})はauth.identitiesに
// provider="email"の行を作らないが、Admin APIの
// admin.updateUserById()経由で設定すると、email identityが
// 存在しない場合は正規に新規作成・リンクされる。
// これによりGoogleのみで登録したユーザーがパスワードを設定した後、
// 標準のunlinkIdentity()でGoogle識別子を解除できるようになる。
export async function POST(request: NextRequest) {
    try {
        const { newPassword } = await request.json();
        if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
            return NextResponse.json({ error: "パスワードは6文字以上で入力してください" }, { status: 400 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace("Bearer ", "");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: { user }, error: userErr } = await adminSupabase.auth.getUser(token);
        if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Admin API経由でパスワードを設定（email identityが無ければ正規に作成される）
        const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(user.id, {
            password: newPassword,
        });
        if (updateErr) throw updateErr;

        // has_passwordフラグを更新
        const { error: profileErr } = await adminSupabase
            .from("user_profiles")
            .update({ has_password: true })
            .eq("id", user.id);
        if (profileErr) throw profileErr;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("set-password error:", e);
        return NextResponse.json({ error: e.message ?? "パスワードの設定に失敗しました" }, { status: 500 });
    }
}