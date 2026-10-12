import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deleteUserCompletely } from "@/lib/server/delete-account";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Service Role Keyで管理者クライアントを作成
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 呼び出し元が管理者かチェック
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user: caller }, error: callerErr } = await adminSupabase.auth.getUser(token);
    if (callerErr || !caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: callerProfile } = await adminSupabase
      .from("user_profiles").select("is_admin").eq("id", caller.id).single();
    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 自分自身は削除できない
    if (caller.id === userId) {
      return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
    }

    const result = await deleteUserCompletely(adminSupabase, userId);
    if (!result.ok) {
      console.error(`admin account delete failed at ${result.stage}:`, result.error);
      return NextResponse.json(
        { error: "削除を完了できませんでした。データベースとStorageの状態を確認してください。" },
        { status: result.stage === "auth" ? 500 : 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "削除に失敗しました" }, { status: 500 });
  }
}
