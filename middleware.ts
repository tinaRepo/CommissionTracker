import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// メンテナンス中にアクセスを許可するパスのリスト
const allowedDuringMaintenance = [
  "/maintenance",
  "/login",
  "/auth/",
  "/api/auth/last-login-provider",
];

// メンテナンス中は、管理者以外のユーザーをメンテナンスページにリダイレクトするミドルウェア
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (allowedDuringMaintenance.some(path => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: settings, error: settingsError } = await adminSupabase
    .from("app_settings")
    .select("maintenance_enabled, maintenance_message")
    .eq("setting_key", "maintenance")
    .maybeSingle();

  if (settingsError || !settings?.maintenance_enabled) return NextResponse.next();

  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookies => {
          cookies.forEach(({ name, value, options }) => request.cookies.set(name, value));
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();

  if (user) {
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.is_admin) return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "maintenance", message: settings.maintenance_message || "現在メンテナンス中です。しばらくしてから再度お試しください。" },
      { status: 503, headers: { "Retry-After": "300" } }
    );
  }

  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = "/maintenance";
  maintenanceUrl.search = "";
  return NextResponse.rewrite(maintenanceUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|offline.html).*)"],
};
