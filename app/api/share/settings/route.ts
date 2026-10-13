import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/server/admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const PRIVATE_HEADERS = { "Cache-Control": "no-store, private" };
const SETTINGS_COLUMNS = "share_token, enabled, show_accepting_status, accepting_requests, show_active_count, show_completed_count, show_capacity, capacity, show_display_name, display_name, show_bio, bio, show_social_link, social_link, show_portfolio";
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
  show_portfolio: false,
} as const;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

async function getAuthorizedUser(request: NextRequest) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const admin = createAdminClient();
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
      .select(SETTINGS_COLUMNS)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;

    const { data: selectedGallery, error: galleryError } = await auth.admin
      .from("public_share_gallery")
      .select("image_id, sort_order")
      .eq("user_id", auth.user.id)
      .order("sort_order");
    if (galleryError) throw galleryError;

    const page = Number(request.nextUrl.searchParams.get("imagesPage") ?? "0");
    if (!Number.isInteger(page) || page < 0 || page > 10000) {
      return response({ error: "画像一覧のページ指定が不正です" }, 400);
    }
    const pageSize = 24;
    const { data: images, error: imagesError } = await auth.admin
      .from("task_images")
      .select("id, storage_path, file_name, image_type, uploaded_at, tasks!inner(title, user_id)")
      .eq("tasks.user_id", auth.user.id)
      .order("uploaded_at", { ascending: false })
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize);
    if (imagesError) throw imagesError;

    const currentImages = (images ?? []).slice(0, pageSize);
    let selectedImages = currentImages;
    if (selectedGallery?.length) {
      const { data, error: selectedImagesError } = await auth.admin
        .from("task_images")
        .select("id, storage_path, file_name, image_type, uploaded_at, tasks!inner(title, user_id)")
        .eq("tasks.user_id", auth.user.id)
        .in("id", selectedGallery.map(item => item.image_id));
      if (selectedImagesError) throw selectedImagesError;
      selectedImages = data ?? [];
    } else {
      selectedImages = [];
    }

    const paths = [...new Set([...currentImages, ...selectedImages].map(image => image.storage_path))];
    const { data: signedImages, error: signedError } = paths.length
      ? await auth.admin.storage.from("task-images").createSignedUrls(paths, 600)
      : { data: [], error: null };
    if (signedError) throw signedError;
    const signedByPath = new Map((signedImages ?? []).map(image => [image.path, image.signedUrl]));

    const mapImage = (image: (typeof currentImages)[number]) => {
      const task = image.tasks as unknown as { title: string; user_id: string };
      return {
        id: image.id,
        fileName: image.file_name,
        imageType: image.image_type,
        taskTitle: task.title,
        previewUrl: signedByPath.get(image.storage_path) ?? null,
      };
    };
    return response({
      settings: data ?? null,
      galleryImageIds: (selectedGallery ?? []).map(item => item.image_id),
      selectedImages: selectedImages.map(mapImage),
      images: currentImages.map(mapImage),
      imagesPage: page,
      hasMoreImages: (images ?? []).length > pageSize,
    });
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
        .select(SETTINGS_COLUMNS)
        .single();
      if (error) throw error;
      return response({ settings: data, rotated: !!existing });
    }

    const booleanFields = [
      "enabled", "show_accepting_status", "accepting_requests", "show_active_count",
      "show_completed_count", "show_capacity", "show_display_name", "show_bio", "show_social_link",
      "show_portfolio",
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

    const { capacity, display_name, bio, social_link, galleryImageIds } = payload;
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

    if (
      !Array.isArray(galleryImageIds) ||
      galleryImageIds.length > 20 ||
      galleryImageIds.some(id => typeof id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) ||
      new Set(galleryImageIds).size !== galleryImageIds.length
    ) {
      return response({ error: "実績画像は20枚まで選択できます" }, 400);
    }
    if (payload.show_portfolio && galleryImageIds.length === 0) {
      return response({ error: "実績画像を1枚以上選択してください" }, 400);
    }

    if (galleryImageIds.length > 0) {
      const { data: ownedImages, error: ownedImagesError } = await auth.admin
        .from("task_images")
        .select("id, tasks!inner(user_id)")
        .eq("tasks.user_id", auth.user.id)
        .in("id", galleryImageIds);
      if (ownedImagesError) throw ownedImagesError;
      if ((ownedImages ?? []).length !== galleryImageIds.length) {
        return response({ error: "選択した画像を確認できませんでした。再読み込みしてください。" }, 400);
      }
    }

    const settingsValues = {
      ...DEFAULT_SETTINGS,
      ...Object.fromEntries(booleanFields.map(field => [field, payload[field]])),
      capacity,
      display_name: display_name.trim(),
      bio: bio.trim(),
      social_link: social_link.trim(),
      updated_at: new Date().toISOString(),
    };

    let savedSettings;
    if (existing) {
      const { data, error } = await auth.admin
        .from("public_share_pages")
        .update(settingsValues)
        .eq("user_id", auth.user.id)
        .select(SETTINGS_COLUMNS)
        .single();
      if (error) throw error;
      savedSettings = data;
    } else {
      const { data, error } = await auth.admin
        .from("public_share_pages")
        .insert({
          user_id: auth.user.id,
          share_token: randomBytes(32).toString("base64url"),
          ...settingsValues,
        })
        .select(SETTINGS_COLUMNS)
        .single();
      if (error) throw error;
      savedSettings = data;
    }

    const { error: clearGalleryError } = await auth.admin
      .from("public_share_gallery")
      .delete()
      .eq("user_id", auth.user.id);
    if (clearGalleryError) throw clearGalleryError;

    if (galleryImageIds.length > 0) {
      const { error: galleryError } = await auth.admin.from("public_share_gallery").insert(
        galleryImageIds.map((imageId: string, sortOrder: number) => ({
          user_id: auth.user.id,
          image_id: imageId,
          sort_order: sortOrder,
        })),
      );
      if (galleryError) throw galleryError;
    }

    return response({ settings: savedSettings, galleryImageIds });
  } catch (error) {
    console.error("share settings POST failed", error);
    return response({ error: "共有設定を保存できませんでした" }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePremium(request);
    if ("error" in auth) return auth.error;

    const { error } = await auth.admin
      .from("public_share_pages")
      .delete()
      .eq("user_id", auth.user.id);
    if (error) throw error;
    return response({ deleted: true });
  } catch (error) {
    console.error("share settings DELETE failed", error);
    return response({ error: "共有ページを削除できませんでした" }, 500);
  }
}
