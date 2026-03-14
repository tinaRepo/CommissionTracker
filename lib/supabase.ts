import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const supabase = createClient();

// ---- 型定義 ----
export type Plan = "free" | "standard" | "premium";
export type CommissionStatus = "pending" | "rough" | "progress" | "done" | "cancelled";
export type ImageType = "rough" | "wip" | "finished" | "other";

export interface UserProfile {
  id: string;
  plan: Plan;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  email?: string; // joinして取得する場合
}

export interface Commission {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  x_id?: string;
  ordered_at?: string;
  deadline?: string;
  price?: number;
  currency: string;
  status: CommissionStatus;
  rough_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  images?: CommissionImage[];
}

export interface CommissionImage {
  id: string;
  commission_id: string;
  storage_path: string;
  file_name: string;
  image_type: ImageType;
  uploaded_at: string;
}

// ---- プラン制限 ----
export const PLAN_LIMITS: Record<Plan, { label: string; imageLimit: number | null; color: string; bg: string }> = {
  free:     { label: "無料",        imageLimit: 10,   color: "#6b7280", bg: "#f3f4f6" },
  standard: { label: "スタンダード", imageLimit: 50,   color: "#3b82f6", bg: "#dbeafe" },
  premium:  { label: "プレミアム",   imageLimit: null, color: "#f59e0b", bg: "#fef3c7" },
};

// ---- プロフィール ----
export async function fetchMyProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) {
    console.error("fetchMyProfile error:", error);
    return null;
  }
  return data;
}

// ---- 画像枚数チェック ----
export async function countMyImages(): Promise<number> {
  // 自分の全commissionに紐づく画像数を合計
  const { count, error } = await supabase
    .from("commission_images")
    .select("id", { count: "exact", head: true })
    .in(
      "commission_id",
      (await supabase.from("commissions").select("id")).data?.map(c => c.id) ?? []
    );
  if (error) return 0;
  return count ?? 0;
}

export async function canUploadImage(plan: Plan): Promise<{ ok: boolean; current: number; limit: number | null }> {
  const limit = PLAN_LIMITS[plan].imageLimit;
  if (limit === null) return { ok: true, current: 0, limit: null }; // premium: 無制限
  const current = await countMyImages();
  return { ok: current < limit, current, limit };
}

// ----  ----
export async function fetchCommissions(): Promise<Commission[]> {
  const { data, error } = await supabase
    .from("commissions")
    .select("*, images:commission_images(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCommission(
  values: Omit<Commission, "id" | "user_id" | "created_at" | "updated_at" | "images">
): Promise<Commission> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("commissions")
    .insert({ ...values, user_id: user.id })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateCommission(
  id: string,
  values: Partial<Omit<Commission, "id" | "user_id" | "created_at" | "updated_at" | "images">>
): Promise<Commission> {
  const { data, error } = await supabase
    .from("commissions").update(values).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCommission(id: string): Promise<void> {
  const { error } = await supabase.from("commissions").delete().eq("id", id);
  if (error) throw error;
}

// ---- Storage操作 ----
const BUCKET = "commission-images";

export async function uploadImage(
  commissionId: string,
  file: File,
  imageType: ImageType,
  plan: Plan
): Promise<CommissionImage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // プラン制限チェック
  const { ok, current, limit } = await canUploadImage(plan);
  if (!ok) {
    throw new Error(`PLAN_LIMIT:${current}:${limit}`);
  }

  const ext = file.name.split(".").pop();
  const path = `${user.id}/${commissionId}/${imageType}_${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET).upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("commission_images")
    .insert({ commission_id: commissionId, storage_path: path, file_name: file.name, image_type: imageType })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteImage(image: CommissionImage): Promise<void> {
  await supabase.storage.from(BUCKET).remove([image.storage_path]);
  await supabase.from("commission_images").delete().eq("id", image.id);
}

export async function getSignedImageUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ---- 管理者用 ----
export async function adminFetchAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminUpdateUserPlan(userId: string, plan: Plan): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ plan })
    .eq("id", userId);
  if (error) throw error;
}
