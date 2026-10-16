import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";

// service_role の管理者クライアント（サーバー専用。ブラウザに出さないこと）
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    }
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

export type AdminRequestAuth =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403 | 500; error: string };

export async function getAdminFromRequest(request: Request, admin: SupabaseClient): Promise<AdminRequestAuth> {
  const match = (request.headers.get("authorization") ?? "").match(/^Bearer ([^\s]+)$/i);
  if (!match) return { ok: false, status: 401, error: "Unauthorized" };

  const token = match[1];
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: assurance, error: assuranceError } =
    await admin.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if (assuranceError) {
    console.error("admin MFA assurance check failed:", assuranceError);
    return { ok: false, status: 500, error: "管理者認証を確認できませんでした" };
  }
  if (assurance.currentLevel !== "aal2") {
    return { ok: false, status: 403, error: "MFA_REQUIRED" };
  }

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("admin profile check failed:", profileError);
    return { ok: false, status: 500, error: "管理者権限を確認できませんでした" };
  }
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, user };
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
