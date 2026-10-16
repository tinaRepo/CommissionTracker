import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deleteUserCompletely } from "@/lib/server/delete-account";
import { createAdminClient, getAdminFromRequest } from "@/lib/server/admin";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const auth = await getAdminFromRequest(request, adminSupabase);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const caller = auth.user;

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
