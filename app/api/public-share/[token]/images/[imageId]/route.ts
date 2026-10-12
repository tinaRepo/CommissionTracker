import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string; imageId: string } },
) {
  const { token, imageId } = params;
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token) || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(imageId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const { data: settings, error: settingsError } = await admin
      .from("public_share_pages")
      .select("user_id, enabled, show_portfolio")
      .eq("share_token", token)
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings?.enabled || !settings.show_portfolio) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE });
    }

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("plan")
      .eq("id", settings.user_id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.plan !== "premium") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE });
    }

    const { data: selectedImage, error: selectedImageError } = await admin
      .from("public_share_gallery")
      .select("image_id")
      .eq("user_id", settings.user_id)
      .eq("image_id", imageId)
      .maybeSingle();
    if (selectedImageError) throw selectedImageError;
    if (!selectedImage) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE });
    }

    const { data: image, error: imageError } = await admin
      .from("task_images")
      .select("storage_path, tasks!inner(user_id)")
      .eq("id", imageId)
      .eq("tasks.user_id", settings.user_id)
      .maybeSingle();
    if (imageError) throw imageError;
    if (!image) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE });
    }

    const { data: file, error: fileError } = await admin.storage
      .from("task-images")
      .download(image.storage_path);
    if (fileError) throw fileError;
    return new NextResponse(await file.arrayBuffer(), {
      headers: {
        ...NO_CACHE,
        "Content-Type": file.type || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("public share image GET failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: NO_CACHE });
  }
}
