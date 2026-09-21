import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// GET: パスワード再設定リンクの検証。成功した場合はupdate-passwordページへリダイレクト
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);

    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const code = searchParams.get("code");

    if (!token_hash && !code) {
        return NextResponse.redirect(`${origin}/login`);
    }

    const response = NextResponse.redirect(`${origin}/update-password`);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options as any);
                    });
                },
            },
        }
    );

    // PKCEフロー（メールリンクのtokenがpkce_...形式の場合、Supabaseの検証後にcodeとしてリダイレクトされる）
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            return NextResponse.redirect(`${origin}/login?error=reset_link_invalid`);
        }
        return response;
    }

    // 従来型（token_hash + type）フロー
    const { error } = await supabase.auth.verifyOtp({
        token_hash: token_hash!,
        type: type as any,
    });
    if (error) {
        return NextResponse.redirect(`${origin}/login?error=reset_link_invalid`);
    }
    return response;
}