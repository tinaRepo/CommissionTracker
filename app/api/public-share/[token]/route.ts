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
      .select("user_id, enabled, show_accepting_status, accepting_requests, show_active_count, show_completed_count, show_capacity, capacity, show_display_name, display_name, show_bio, bio, show_social_link, social_link, social_links, show_portfolio")
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

    const activeCountPromise = settings.show_active_count || settings.show_capacity
      ? admin.from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", settings.user_id)
        .in("status", ["pending", "checking", "progress"])
      : Promise.resolve(null);
    const completedCountPromise = settings.show_completed_count
      ? admin.from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", settings.user_id)
        .eq("status", "done")
      : Promise.resolve(null);
    const galleryPromise = settings.show_portfolio
      ? admin.from("public_share_gallery")
        .select("image_id, caption")
        .eq("user_id", settings.user_id)
        .order("sort_order")
      : Promise.resolve(null);
    const [activeResult, completedResult, galleryResult] = await Promise.all([
      activeCountPromise,
      completedCountPromise,
      galleryPromise,
    ]);
    if (activeResult?.error) throw activeResult.error;
    if (completedResult?.error) throw completedResult.error;
    if (galleryResult?.error) throw galleryResult.error;
    const activeCount = activeResult?.count ?? null;
    const completedCount = completedResult?.count ?? null;

    const publicData: Record<string, string | string[] | number | boolean | { id: string; url: string; caption: string }[]> = {};
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
    if (settings.show_social_link) {
      const socialLinks = Array.isArray(settings.social_links)
        ? settings.social_links
        : settings.social_link ? [settings.social_link] : [];
      if (socialLinks.length > 0) publicData.socialLinks = socialLinks;
    }
    if (settings.show_portfolio) {
      publicData.galleryImages = (galleryResult?.data ?? []).map(({ image_id, caption }) => ({
        id: image_id,
        url: `/api/public-share/${encodeURIComponent(token)}/images/${encodeURIComponent(image_id)}`,
        caption,
      }));
    }

    return NextResponse.json(publicData, { headers: NO_CACHE });
  } catch (error) {
    console.error("public share GET failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: NO_CACHE });
  }
}
