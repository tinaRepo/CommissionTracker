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
  "/api/stripe/webhook", // Stripeの通知を取りこぼさない（署名検証はルート側で行う）
  "/api/health",         // 死活監視（メンテナンス中も実際の状態を返す）
];

// メンテナンス設定の短期キャッシュ（Edgeインスタンス単位）。
// 全リクエストでDBを引かないための最適化。切り替わりの反映遅延は最大 TTL 秒。
const SETTINGS_TTL_MS = 10_000;
type MaintenanceSettings = { enabled: boolean; message: string | null };
let cachedSettings: { at: number; value: MaintenanceSettings } | null = null;

// app_settings は全員が読める（RLSでselect許可済み）ため、service_role ではなく anon キーで取得する
async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  const now = Date.now();
  if (cachedSettings && now - cachedSettings.at < SETTINGS_TTL_MS) return cachedSettings.value;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase
    .from("app_settings")
    .select("maintenance_enabled, maintenance_message")
    .eq("setting_key", "maintenance")
    .maybeSingle();

  // 取得に失敗した場合は通常公開として扱う（従来と同じ。キャッシュはしない）
  if (error || !data) return { enabled: false, message: null };

  const value = { enabled: !!data.maintenance_enabled, message: data.maintenance_message ?? null };
  cachedSettings = { at: now, value };
  return value;
}

// メンテナンス中は、管理者以外のユーザーをメンテナンスページにリダイレクトするミドルウェア
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (allowedDuringMaintenance.some(path => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const settings = await getMaintenanceSettings();
  if (!settings.enabled) return NextResponse.next();

  // 管理者判定: ユーザーのセッションで自分の user_profiles を読む（RLSで本人の行は読める）
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookies => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();

  if (user) {
    const { data: profile } = await authClient
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.is_admin) return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "maintenance", message: settings.message || "現在メンテナンス中です。しばらくしてから再度お試しください。" },
      { status: 503, headers: { "Retry-After": "300" } }
    );
  }

  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = "/maintenance";
  maintenanceUrl.search = "";
  return NextResponse.rewrite(maintenanceUrl);
}

// 静的ファイル（Service Worker・manifest・アイコン・robots等）はミドルウェアを通さない。
// ※ sw.js がメンテナンス画面に書き換わってPWAが壊れるのを防ぐ。
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|offline.html|robots.txt|sitemap.xml|ads.txt|.*\\.(?:js|json|png|jpg|jpeg|gif|svg|webp|ico|css|txt|xml|woff|woff2)$).*)",
  ],
};
