import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  const adminSupabase = createAdminClient();
  const { data: { user }, error } = await adminSupabase.auth.getUser(token);
  if (error || !user) return null;
  return { adminSupabase, user };
}

// POST: Web Push通知の購読情報を保存するAPIルート（1ユーザー複数端末。端末はendpointで識別）
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subscription } = await request.json();
    if (!subscription || typeof subscription.endpoint !== "string" || !subscription.endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "subscriptionが不正です" }, { status: 400 });
    }

    // 購読情報をupsert（同じ端末は上書き、別端末は追加）
    const { error: dbError } = await auth.adminSupabase
      .from("push_subscriptions")
      .upsert({ user_id: auth.user.id, subscription }, { onConflict: "user_id,endpoint" });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("subscribe error:", e);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

// DELETE: Web Push通知の購読情報を削除するAPIルート
//   body に { endpoint } があればその端末の分だけ、無ければこのユーザーの全端末分を削除する
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await request.json().catch(() => ({}));
    let query = auth.adminSupabase.from("push_subscriptions").delete().eq("user_id", auth.user.id);
    if (typeof payload?.endpoint === "string") query = query.eq("endpoint", payload.endpoint);

    const { error: dbError } = await query;
    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("unsubscribe error:", e);
    return NextResponse.json({ error: "解除に失敗しました" }, { status: 500 });
  }
}
