import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// POST: Web Push通知の購読情報を保存するAPIルート
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subscription } = await request.json();

    // 購読情報をupsert
    const { error: dbError } = await adminSupabase
      .from("push_subscriptions")
      .upsert({ user_id: user.id, subscription }, { onConflict: "user_id" });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("subscribe error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Web Push通知の購読情報を削除するAPIルート
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminSupabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("unsubscribe error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
