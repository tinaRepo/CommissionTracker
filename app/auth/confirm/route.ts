import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);

    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!token_hash || !type) {
        return NextResponse.redirect(`${origin}/login`);
    }

    const response = NextResponse.redirect(
        `${origin}/update-password`
    );

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

    const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
    });

    if (error) {
        return NextResponse.redirect(
            `${origin}/login?error=reset_link_invalid`
        );
    }

    return response;
}