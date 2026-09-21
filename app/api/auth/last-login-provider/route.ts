import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "ct_last_login_provider";

// GET: ログイン画面（未認証）がバッジ表示のために呼ぶ。Cookieの値のみ返す
export async function GET(request: NextRequest) {
    const provider = request.cookies.get(COOKIE_NAME)?.value ?? null;
    return NextResponse.json({ provider });
}

// POST: ログイン成功後にCommissionAppが呼ぶ。DBへ保存 + HttpOnly Cookieを発行
export async function POST(request: NextRequest) {
    try {
        const { provider } = await request.json();
        if (!provider || typeof provider !== "string") {
            return NextResponse.json({ error: "provider is required" }, { status: 400 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace("Bearer ", "");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: { user }, error } = await adminSupabase.auth.getUser(token);
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // DBを正として保存（ログイン後の画面用・最終ログイン日時も同時に記録）
        await adminSupabase
            .from("user_profiles")
            .update({ last_login_provider: provider, last_sign_in_at: new Date().toISOString() })
            .eq("id", user.id);

        // ログイン画面（未認証）用にHttpOnly Cookieを発行（JSからは読み書き不可）
        const response = NextResponse.json({ success: true });
        response.cookies.set(COOKIE_NAME, provider, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 90,
        });
        return response;
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "failed" }, { status: 500 });
    }
}