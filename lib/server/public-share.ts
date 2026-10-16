import { createAdminClient } from "@/lib/server/admin";

export type PublicShareData = {
  state?: "unpublished";
  acceptingRequests?: boolean;
  activeCount?: number;
  availableSlots?: number;
  completedCount?: number;
  displayName?: string;
  bio?: string;
  socialLinks?: string[];
  galleryImages?: { id: string; url: string; caption: string }[];
};

export async function getPublicShareData(token: string): Promise<PublicShareData | null> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;

  const admin = createAdminClient();
  const { data: settings, error: settingsError } = await admin
    .from("public_share_pages")
    .select("user_id, enabled, show_accepting_status, accepting_requests, show_active_count, show_completed_count, show_capacity, capacity, show_display_name, display_name, show_bio, bio, show_social_link, social_link, social_links, show_portfolio")
    .eq("share_token", token)
    .maybeSingle();
  if (settingsError) throw settingsError;
  if (!settings) return null;
  if (!settings.enabled) return { state: "unpublished" };

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("plan")
    .eq("id", settings.user_id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.plan !== "premium") return null;

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

  const selectedImages = galleryResult?.data ?? [];
  let galleryImages: PublicShareData["galleryImages"];
  if (selectedImages.length > 0) {
    const { data: imageRows, error: imageError } = await admin
      .from("task_images")
      .select("id, storage_path, tasks!inner(user_id)")
      .eq("tasks.user_id", settings.user_id)
      .in("id", selectedImages.map(image => image.image_id));
    if (imageError) throw imageError;

    const paths = (imageRows ?? []).map(image => image.storage_path);
    const { data: signedImages, error: signedError } = paths.length
      ? await admin.storage.from("task-images").createSignedUrls(paths, 600)
      : { data: [], error: null };
    if (signedError) throw signedError;
    const signedByPath = new Map(
      (signedImages ?? []).flatMap(image =>
        image.path && image.signedUrl ? [[image.path, image.signedUrl] as const] : []
      )
    );
    const imagesById = new Map((imageRows ?? []).map(image => [image.id, image]));
    const captions = new Map(selectedImages.map(image => [image.image_id, image.caption]));
    galleryImages = selectedImages.flatMap(selectedImage => {
      const image = imagesById.get(selectedImage.image_id);
      if (!image) return [];
      const url = signedByPath.get(image.storage_path);
      return url
        ? [{ id: image.id, url, caption: captions.get(image.id) ?? "" }]
        : [];
    });
  }

  const publicData: PublicShareData = {};
  if (settings.show_accepting_status) publicData.acceptingRequests = settings.accepting_requests;
  if (settings.show_active_count) publicData.activeCount = activeResult?.count ?? 0;
  if (settings.show_capacity) {
    publicData.availableSlots = settings.accepting_requests
      ? Math.max(0, settings.capacity - (activeResult?.count ?? 0))
      : 0;
  }
  if (settings.show_completed_count) publicData.completedCount = completedResult?.count ?? 0;
  if (settings.show_display_name && settings.display_name) publicData.displayName = settings.display_name;
  if (settings.show_bio && settings.bio) publicData.bio = settings.bio;
  if (settings.show_social_link) {
    const socialLinks = Array.isArray(settings.social_links)
      ? settings.social_links
      : settings.social_link ? [settings.social_link] : [];
    if (socialLinks.length > 0) publicData.socialLinks = socialLinks;
  }
  if (settings.show_portfolio) publicData.galleryImages = galleryImages ?? [];
  return publicData;
}
