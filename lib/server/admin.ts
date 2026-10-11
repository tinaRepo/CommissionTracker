import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";

// service_role の管理者クライアント（サーバー専用。ブラウザに出さないこと）
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Authorization: Bearer <access_token> からログインユーザーを取得する（無効なら null）
export async function getUserFromRequest(request: Request, admin: SupabaseClient): Promise<User | null> {
  const token = (request.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// レート制限の判定（RPC: check_rate_limit）。判定に失敗したら "error"（呼び出し側は安全側＝拒否にする）
export async function checkRateLimit(
  admin: SupabaseClient, key: string, limit: number, windowSeconds: number
): Promise<"ok" | "limited" | "error"> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key, p_limit: limit, p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed:", error);
    return "error";
  }
  return data === true ? "ok" : "limited";
}

// Bearer <CRON_SECRET> の定数時間比較（Cron・ヘルス詳細チェック用）
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    console.error("CRON_SECRET is not set or too short");
    return false;
  }
  const sha = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(sha(request.headers.get("authorization") ?? ""), sha(`Bearer ${secret}`));
}
