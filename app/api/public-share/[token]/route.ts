import { createAdminClient } from "@/lib/server/admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const NO_CACHE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  const token = params.token;
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE });
  }

  const admin = createAdminClient();

  try {
    const { data: settings, error: settingsError } = await admin
      .from("public_share_pages")
      .select("user_id, enabled, show_accepting_status, accepting_requests, show_active_count, show_completed_count, show_capacity, capacity, show_display_name, display_name, show_bio, bio, show_social_link, social_link, show_portfolio")
      .eq("share_token", token)
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_CACHE });
    }
    if (!settings.enabled) {
      return NextResponse.json({ state: "unpublished" }, { headers: NO_CACHE });
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

    let activeCount: number | null = null;
    let completedCount: number | null = null;
    if (settings.show_active_count || settings.show_capacity) {
      const { count, error } = await admin.from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", settings.user_id)
        .in("status", ["pending", "checking", "progress"]);
      if (error) throw error;
      activeCount = count ?? 0;
    }
    if (settings.show_completed_count) {
      const { count, error } = await admin.from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", settings.user_id)
        .eq("status", "done");
      if (error) throw error;
      completedCount = count ?? 0;
    }

    const publicData: Record<string, string | number | boolean | { id: string; url: string }[]> = {};
    if (settings.show_accepting_status) publicData.acceptingRequests = settings.accepting_requests;
    if (settings.show_active_count) publicData.activeCount = activeCount ?? 0;
    if (settings.show_capacity) {
      publicData.availableSlots = settings.accepting_requests
        ? Math.max(0, settings.capacity - (activeCount ?? 0))
        : 0;
    }
    if (settings.show_completed_count) publicData.completedCount = completedCount ?? 0;
    if (settings.show_display_name && settings.display_name) publicData.displayName = settings.display_name;
    if (settings.show_bio && settings.bio) publicData.bio = settings.bio;
    if (settings.show_social_link && settings.social_link) publicData.socialLink = settings.social_link;
    if (settings.show_portfolio) {
      const { data: gallery, error: galleryError } = await admin
        .from("public_share_gallery")
        .select("image_id")
        .eq("user_id", settings.user_id)
        .order("sort_order");
      if (galleryError) throw galleryError;
      publicData.galleryImages = (gallery ?? []).map(({ image_id }) => ({
        id: image_id,
        url: `/api/public-share/${encodeURIComponent(token)}/images/${encodeURIComponent(image_id)}`,
      }));
    }

    return NextResponse.json(publicData, { headers: NO_CACHE });
  } catch (error) {
    console.error("public share GET failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: NO_CACHE });
  }
}
