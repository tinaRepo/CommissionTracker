import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "no-store, private" };
const DEFAULT_SETTINGS = {
  enabled: false,
  show_accepting_status: false,
  accepting_requests: false,
  show_active_count: false,
  show_completed_count: false,
  show_capacity: false,
  capacity: 0,
  show_display_name: false,
  display_name: "",
  show_bio: false,
  bio: "",
  show_social_link: false,
  social_link: "",
} as const;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

async function getAuthorizedUser(request: NextRequest) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return { admin, user: data.user };
}

async function requirePremium(request: NextRequest) {
  const auth = await getAuthorizedUser(request);
  if (!auth) return { error: response({ error: "Unauthorized" }, 401) } as const;

  const { data: profile, error } = await auth.admin
    .from("user_profiles")
    .select("plan")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) {
    console.error("share settings: failed to load plan", error);
    return { error: response({ error: "共有設定を確認できませんでした" }, 500) } as const;
  }
  if (profile?.plan !== "premium") {
    return { error: response({ error: "premium_required" }, 403) } as const;
  }
  return { admin: auth.admin, user: auth.user } as const;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePremium(request);
    if ("error" in auth) return auth.error;

    const { data, error } = await auth.admin
      .from("public_share_pages")
      .select("share_token, enabled, show_accepting_status, accepting_requests, show_active_count, show_completed_count, show_capacity, capacity, show_display_name, display_name, show_bio, bio, show_social_link, social_link")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;

    return response({ settings: data ?? null });
  } catch (error) {
    console.error("share settings GET failed", error);
    return response({ error: "共有設定を読み込めませんでした" }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePremium(request);
    if ("error" in auth) return auth.error;

    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return response({ error: "リクエストが不正です" }, 400);
    }

    const { data: existing, error: lookupError } = await auth.admin
      .from("public_share_pages")
      .select("share_token")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (payload.action === "regenerate") {
      const { data, error } = await auth.admin
        .from("public_share_pages")
        .upsert({
          user_id: auth.user.id,
          share_token: randomBytes(32).toString("base64url"),
          enabled: false,
        }, { onConflict: "user_id" })
        .select("share_token, enabled, show_accepting_status, accepting_requests, show_active_count, show_completed_count, show_capacity, capacity, show_display_name, display_name, show_bio, bio, show_social_link, social_link")
        .single();
      if (error) throw error;
      return response({ settings: data, rotated: !!existing });
    }

    const booleanFields = [
      "enabled", "show_accepting_status", "accepting_requests", "show_active_count",
      "show_completed_count", "show_capacity", "show_display_name", "show_bio", "show_social_link",
    ] as const;
    for (const field of booleanFields) {
      if (typeof payload[field] !== "boolean") {
        return response({ error: "公開設定の形式が正しくありません" }, 400);
      }
    }
    if (
      payload.enabled &&
      !booleanFields.some(field => field.startsWith("show_") && payload[field] === true)
    ) {
      return response({ error: "公開する項目を1つ以上選択してください" }, 400);
    }

    const { capacity, display_name, bio, social_link } = payload;
    if (!Number.isInteger(capacity) || capacity < 0 || capacity > 1000) {
      return response({ error: "受付枠は0〜1000件で入力してください" }, 400);
    }
    if (
      typeof display_name !== "string" || display_name.length > 80 ||
      typeof bio !== "string" || bio.length > 500 ||
      typeof social_link !== "string" || social_link.length > 2048
    ) {
      return response({ error: "公開プロフィールの入力内容を確認してください" }, 400);
    }
    if (social_link) {
      try {
        const url = new URL(social_link);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Invalid protocol");
      } catch {
        return response({ error: "SNSリンクはhttpまたはhttpsのURLで入力してください" }, 400);
      }
    }

    const { data, error } = await auth.admin
      .from("public_share_pages")
      .upsert({
        user_id: auth.user.id,
        share_token: existing?.share_token ?? randomBytes(32).toString("base64url"),
        ...DEFAULT_SETTINGS,
        ...Object.fromEntries(booleanFields.map(field => [field, payload[field]])),
        capacity,
        display_name: display_name.trim(),
        bio: bio.trim(),
        social_link: social_link.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("share_token, enabled, show_accepting_status, accepting_requests, show_active_count, show_completed_count, show_capacity, capacity, show_display_name, display_name, show_bio, bio, show_social_link, social_link")
      .single();
    if (error) throw error;

    return response({ settings: data });
  } catch (error) {
    console.error("share settings POST failed", error);
    return response({ error: "共有設定を保存できませんでした" }, 500);
  }
}
