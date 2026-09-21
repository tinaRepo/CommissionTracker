import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

// --- Supabaseクライアントの作成 ---
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// --- クライアントはアプリ全体で共有 ---
export const supabase = createClient();

// ---- 型定義 ----
export type Plan = "free" | "standard" | "premium";
export type CommissionStatus = "pending" | "rough" | "progress" | "done" | "cancelled";
export type ImageType = "rough" | "wip" | "finished" | "other";

// --- ユーザ情報 ---
export interface UserProfile {
  id: string;
  plan: Plan;
  is_admin: boolean;
  display_name?: string;
  has_password: boolean;
  last_login_provider?: string;
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
  email?: string;
}

// --- 依頼情報 ---
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

// --- 画像情報 ---
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
  free: { label: "無料", imageLimit: 10, color: "#6b7280", bg: "#f3f4f6" },
  standard: { label: "スタンダード", imageLimit: 50, color: "#3b82f6", bg: "#dbeafe" },
  premium: { label: "プレミアム", imageLimit: null, color: "#f59e0b", bg: "#fef3c7" },
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

// --- 直近ログインで使われた認証プロバイダーを判定（identitiesのlast_sign_in_atを比較） ---
export function getLastSignInProvider(user: User | null): string | null {
  if (!user?.identities || user.identities.length === 0) return null;
  const sorted = [...user.identities].sort((a, b) => {
    const at = new Date(a.last_sign_in_at ?? a.updated_at ?? 0).getTime();
    const bt = new Date(b.last_sign_in_at ?? b.updated_at ?? 0).getTime();
    return bt - at;
  });
  return sorted[0]?.provider ?? null;
}

// --- Googleのidentityを持っているか（連携済みか） ---
// identitiesはlinkIdentity/unlinkIdentityで正しく同期されるため、DB保存は不要
export function hasGoogleIdentity(user: User | null): boolean {
  return !!user?.identities?.some(i => i.provider === "google");
}

// --- Googleアカウントとの連携（メール登録ユーザー向け） ---
export async function linkGoogleAccount(): Promise<void> {
  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: `${location.origin}/` },
  });
  if (error) throw error;
  // 成功後はGoogleの認証画面へ遷移し、完了後にredirectToへ戻ってくる
}

// --- Google連携の解除 ---
export async function unlinkGoogleAccount(user: User): Promise<void> {
  const googleIdentity = user.identities?.find(i => i.provider === "google");
  if (!googleIdentity) throw new Error("Googleアカウントは連携されていません");
  const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
  if (error) throw error;
}

// --- パスワード変更（既にパスワードが設定済みのユーザー向け） ---
// identityは既にemailが存在するため、通常のupdateUserで問題ない
export async function changeMyPassword(newPassword: string, currentPassword: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("ユーザー情報を取得できませんでした");

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) throw new Error("現在のパスワードが正しくありません");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// --- パスワード設定リクエスト（Google専用ユーザー向け） ---
// Supabaseが公式に案内する「OAuthユーザーにパスワードログインを追加する」方法。
// 通常のupdateUser({password})はemail identityを正規に紐付けないため、
// 既存のパスワードリセット導線（/auth/confirm → /update-password）を再利用する。
// このフローで設定すると、以降は標準のunlinkIdentity()でGoogle連携を解除できる。
export async function requestSetPasswordEmail(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("ユーザー情報を取得できませんでした");

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${location.origin}/auth/confirm`,
  });
  if (error) throw error;
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

// --- 画像アップロード前にプラン制限をチェック ---
export async function canUploadImage(plan: Plan): Promise<{ ok: boolean; current: number; limit: number | null }> {
  const limit = PLAN_LIMITS[plan].imageLimit;
  if (limit === null) return { ok: true, current: 0, limit: null }; // premium: 無制限
  const current = await countMyImages();
  return { ok: current < limit, current, limit };
}

// ---- 依頼情報の取得 ----
export async function fetchCommissions(): Promise<Commission[]> {
  const { data, error } = await supabase
    .from("commissions")
    .select("*, images:commission_images(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---- 依頼情報の作成 ----
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

// --- IDで特定の依頼情報を取得 ---
export async function fetchCommissionById(id: string): Promise<Commission | null> {
  const { data, error } = await supabase
    .from("commissions")
    .select("*, images:commission_images(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// --- IDで特定の依頼情報を更新 ---
export async function updateCommission(
  id: string,
  values: Partial<Omit<Commission, "id" | "user_id" | "created_at" | "updated_at" | "images">>
): Promise<Commission> {
  const { data, error } = await supabase
    .from("commissions").update(values).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// --- IDで特定の依頼情報を削除 ---
export async function deleteCommission(id: string): Promise<void> {
  const { error } = await supabase.from("commissions").delete().eq("id", id);
  if (error) throw error;
}

// ---- Storage操作 ----
const BUCKET = "commission-images";

// --- 画像アップロード ---
export async function uploadImage(
  commissionId: string,
  file: File,
  imageType: ImageType,
  plan: Plan
): Promise<CommissionImage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // --- プラン制限チェック ---
  const { ok, current, limit } = await canUploadImage(plan);
  if (!ok) {
    throw new Error(`PLAN_LIMIT:${current}:${limit}`);
  }

  // --- ファイル名から拡張子を取得して保存パスを生成 ---
  const ext = file.name.split(".").pop();
  const path = `${user.id}/${commissionId}/${imageType}_${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET).upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  // --- 画像情報をDBに保存 ---
  const { data, error } = await supabase
    .from("commission_images")
    .insert({ commission_id: commissionId, storage_path: path, file_name: file.name, image_type: imageType })
    .select().single();
  if (error) throw error;
  return data;
}

// --- 画像削除 ---
export async function deleteImage(image: CommissionImage): Promise<void> {
  await supabase.storage.from(BUCKET).remove([image.storage_path]);
  await supabase.from("commission_images").delete().eq("id", image.id);
}

// --- 画像の署名付きURLを取得 ---
export async function getSignedImageUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ---- 管理者用 ----
// --- ユーザが自分のアカウント削除をリクエスト ---
export async function requestDeleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";
  const res = await fetch("/api/request-delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? "送信に失敗しました");
  }
}

// --- 管理者がユーザを削除 ---
export async function adminDeleteUser(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";
  const res = await fetch("/api/admin/delete-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? "削除に失敗しました");
  }
}

// --- 管理者が全ユーザを取得 ---
export async function adminFetchAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// --- 管理者がユーザのプランを更新 ---
export async function adminUpdateUserPlan(userId: string, plan: Plan): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ plan })
    .eq("id", userId);
  if (error) throw error;
}
