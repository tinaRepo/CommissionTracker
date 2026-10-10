import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient, getUserFromRequest } from "@/lib/server/admin";
import { deleteUserCompletely } from "@/lib/server/delete-account";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 呼び出し元が管理者かチェック
    const caller = await getUserFromRequest(request, admin);
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: callerProfile } = await admin
      .from("user_profiles").select("is_admin").eq("id", caller.id).single();
    if (!callerProfile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 自分自身は削除できない
    if (caller.id === userId) {
      return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
    }

    const result = await deleteUserCompletely(admin, userId);
    if (!result.ok) {
      console.error(`delete-user failed at ${result.stage}:`, result.error);
      const message =
        result.stage === "stripe" ? "Stripeの解約に失敗したため、ユーザーは削除していません。再度お試しください。"
          : result.stage === "storage" ? "画像の削除に失敗したため、ユーザーは削除していません。再度お試しください。"
            : "削除に失敗しました";
      return NextResponse.json({ error: message }, { status: result.stage === "auth" ? 500 : 502 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("delete-user error:", e);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
