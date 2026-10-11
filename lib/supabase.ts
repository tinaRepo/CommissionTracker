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
// pending: 依頼済み / checking: 確認中（旧ラフ確認中） / progress: 対応中 / done: 完成 / cancelled: キャンセル
export type TaskStatus = "pending" | "checking" | "progress" | "done" | "cancelled";
// preview: 確認用（旧ラフ） / wip: 作業中 / finished: 完成 / other: その他
export type ImageType = "preview" | "wip" | "finished" | "other";

// --- ユーザ情報 ---
export interface UserProfile {
  id: string;
  plan: Plan;
  is_admin: boolean;
  display_name?: string;
  has_password: boolean;
  last_login_provider?: string;
  last_sign_in_at?: string;
  stripe_customer_id?: string | null;
  subscription_status?: string | null; // active / inactive / past_due
  created_at: string;
  updated_at: string;
  email?: string;
}

// --- タスク（旧: 依頼）情報 ---
export interface Task {
  id: string;
  user_id: string;
  title: string;
  assignee_name: string; // 依頼先名（旧: 絵師名）
  contact?: string; // SNS/連絡先（旧: X ID）
  ordered_at?: string;
  deadline?: string;
  price?: number;
  currency: string;
  status: TaskStatus;
  submission_date?: string; // 提出日（旧: ラフ提出日）
  notes?: string;
  created_at: string;
  updated_at: string;
  images?: TaskImage[];
  tag_ids?: string[]; // 付与されているタグのID（fetchTasks が task_tags から導出）
}

// --- タスクの作成・更新用の入力（空にした項目は undefined ではなく null で送る） ---
// ※ supabase-js の update() は undefined のキーを無視するため、項目を「空にする」には null が必要
export interface TaskInput {
  title: string;
  assignee_name: string;
  contact: string | null;
  ordered_at: string | null;
  deadline: string | null;
  price: number | null;
  currency: string;
  status: TaskStatus;
  submission_date: string | null;
  notes: string | null;
}

// --- タグ ---
export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

// --- 画像情報 ---
export interface TaskImage {
  id: string;
  task_id: string;
  storage_path: string;
  file_name: string;
  image_type: ImageType;
  uploaded_at: string;
}

// ---- プラン制限 ----
// ※ 画像枚数の上限は DB のトリガー enforce_task_image_limit() にも同じ値がある。変更時は両方更新すること
export const PLAN_LIMITS: Record<Plan, { label: string; imageLimit: number | null; color: string; bg: string }> = {
  free: { label: "無料", imageLimit: 10, color: "#6e6e73", bg: "#f5f5f7" },
  standard: { label: "スタンダード", imageLimit: 50, color: "#0066cc", bg: "#e8f1fb" },
  premium: { label: "プレミアム", imageLimit: null, color: "#ffffff", bg: "#1d1d1f" },
};

// --- タグの上限（DBのトリガー enforce_tag_limit / enforce_task_tag_limit と同じ値） ---
export const TAG_NAME_MAX_LENGTH = 30;
export const TAGS_PER_TASK_LIMIT = 10;
export const TAGS_PER_USER_LIMIT = 100;

// --- 簡易メールアドレス形式チェック ---
export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const DISPLAY_NAME_MAX_LENGTH = 30;
// 新規登録・パスワード変更時の最小長（ログイン時は既存パスワードを弾かないため適用しない）
export const PASSWORD_MIN_LENGTH = 8;

// --- Supabaseのエラーメッセージを日本語に変換 ---
export function toJapaneseAuthError(message: string): string {
  const normalized = message.toLowerCase().replace(/[_-]+/g, " ");
  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("over email send rate limit") ||
    normalized.includes("over request rate limit") ||
    normalized.includes("rate limit exceeded") ||
    normalized.includes("too many requests") ||
    normalized.includes("email rate limit") ||
    normalized.includes("email frequency limit") ||
    normalized.includes("for security purposes") ||
    normalized.includes("request this after") ||
    normalized.includes("429")
  ) {
    return "メールの送信回数が上限に達しました。しばらく時間をおいてから、もう一度お試しください。";
  }
  if (normalized.includes("invalid login credentials") || normalized.includes("user not found")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (normalized.includes("email not confirmed")) {
    return "メールアドレスの確認が完了していません。確認メールをご確認ください。";
  }
  if (normalized.includes("user already registered")) {
    return "このメールアドレスはすでに登録されています。ログインしてください。";
  }
  if (normalized.includes("password should be at least")) {
    return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`;
  }
  if (normalized.includes("unable to validate email") || normalized.includes("email address is invalid")) {
    return "メールアドレスの形式が正しくありません。";
  }
  if (normalized.includes("signup is disabled")) {
    return "現在、新規登録は受け付けていません。";
  }
  if (normalized.includes("token has expired") || normalized.includes("auth session missing")) {
    return "リンクの有効期限が切れています。もう一度メールを送信してください。";
  }
  if (normalized.includes("network")) {
    return "ネットワークエラーが発生しました。接続を確認してください。";
  }
  return message || "エラーが発生しました。";
}

// ---- プロフィール ----
export async function fetchMyProfile(): Promise<UserProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
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
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
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
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user?.email) throw new Error("ユーザー情報を取得できませんでした");

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${location.origin}/auth/confirm`,
  });
  if (error) throw error;
}

// ---- 画像枚数チェック ----
export async function countMyImages(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("task_images")
    .select("id, tasks!inner(user_id)", { count: "exact", head: true })
    .eq("tasks.user_id", userId);
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

// ---- タスク情報の取得 ----
// task_tags の埋め込みを tag_ids（タグIDの配列）に変換して返す
type TaskRow = Omit<Task, "tag_ids"> & { task_tags?: { tag_id: string }[] | null };
const TASK_SELECT = "*, images:task_images(*), task_tags(tag_id)";

function toTask(row: TaskRow): Task {
  const { task_tags, ...rest } = row;
  return { ...rest, tag_ids: (task_tags ?? []).map(t => t.tag_id) };
}

export async function fetchTasks(): Promise<Task[]> {
  // PostgRESTの1リクエスト上限（max_rows=1000）を超えても全件取得できるようページングする
  const PAGE = 1000;
  const all: Task[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true }) // 同時刻の行で順序が揺れないようにする
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as TaskRow[];
    all.push(...rows.map(toTask));
    if (rows.length < PAGE) break;
  }
  return all;
}

// ---- タスク情報の作成 ----
export async function createTask(values: TaskInput): Promise<Task> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...values, user_id: user.id })
    .select().single();
  if (error) throw error;
  return data;
}

// --- IDで特定のタスク情報を取得 ---
export async function fetchTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data ? toTask(data as unknown as TaskRow) : null;
}

// --- IDで特定のタスク情報を更新 ---
export async function updateTask(id: string, values: Partial<TaskInput>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks").update(values).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// --- IDで特定のタスク情報を削除 ---
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---- タグ ----
// タグ名の正規化（全角/半角のゆれ・前後の空白・連続空白をそろえる）
export function normalizeTagName(raw: string): string {
  return raw.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, TAG_NAME_MAX_LENGTH);
}

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from("tags").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// タグを作成する。同じ名前が既にあれば、そのタグを返す
export async function createTag(rawName: string): Promise<Tag> {
  const name = normalizeTagName(rawName);
  if (!name) throw new Error("タグ名を入力してください");
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.from("tags").insert({ user_id: user.id, name }).select().single();
  if (!error) return data;
  if (error.code === "23505") {
    const { data: existing, error: e2 } = await supabase.from("tags").select("*").eq("name", name).single();
    if (e2) throw e2;
    return existing;
  }
  if (error.message?.includes("TAG_LIMIT")) throw new Error(`タグは${TAGS_PER_USER_LIMIT}個まで作成できます`);
  throw error;
}

export async function renameTag(id: string, rawName: string): Promise<void> {
  const name = normalizeTagName(rawName);
  if (!name) throw new Error("タグ名を入力してください");
  const { error } = await supabase.from("tags").update({ name }).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("同じ名前のタグがすでにあります");
    throw error;
  }
}

// タグを削除する（付与済みのタスクからも外れる。タスク自体は残る）
export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

// タスクのタグを tagIds に置き換える（差分だけ削除・追加する）
export async function setTaskTags(taskId: string, tagIds: string[]): Promise<void> {
  const wanted = Array.from(new Set(tagIds));
  const { data: current, error } = await supabase.from("task_tags").select("tag_id").eq("task_id", taskId);
  if (error) throw error;
  const have = new Set((current ?? []).map(r => r.tag_id as string));

  const toRemove = [...have].filter(id => !wanted.includes(id));
  const toAdd = wanted.filter(id => !have.has(id));

  if (toRemove.length > 0) {
    const { error: e1 } = await supabase.from("task_tags").delete().eq("task_id", taskId).in("tag_id", toRemove);
    if (e1) throw e1;
  }
  if (toAdd.length > 0) {
    const { error: e2 } = await supabase.from("task_tags").insert(toAdd.map(tag_id => ({ task_id: taskId, tag_id })));
    if (e2) {
      if (e2.message?.includes("TASK_TAG_LIMIT")) throw new Error(`1つのタスクに付けられるタグは${TAGS_PER_TASK_LIMIT}個までです`);
      throw e2;
    }
  }
}

// ---- 通知時刻（JSTの「時」。user_settings.notify_hour。既定は8） ----
export const DEFAULT_NOTIFY_HOUR = 8;

export async function fetchNotifyHour(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return DEFAULT_NOTIFY_HOUR;
  const { data, error } = await supabase
    .from("user_settings").select("notify_hour").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.notify_hour ?? DEFAULT_NOTIFY_HOUR;
}

export async function saveNotifyHour(hour: number): Promise<void> {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error("通知時刻が不正です");
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("user_settings").upsert({ user_id: userId, notify_hour: hour }, { onConflict: "user_id" });
  if (error) throw error;
}

// ---- Storage操作 ----
const BUCKET = "task-images";

// --- 画像アップロード ---
export async function uploadImage(
  taskId: string,
  file: File,
  imageType: ImageType,
  plan: Plan
): Promise<TaskImage> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not authenticated");

  // --- プラン制限チェック ---
  const { ok, current, limit } = await canUploadImage(plan);
  if (!ok) {
    throw new Error(`PLAN_LIMIT:${current}:${limit}`);
  }

  // --- ファイル名から拡張子を取得して保存パスを生成 ---
  const ext = file.name.split(".").pop();
  const path = `${user.id}/${taskId}/${imageType}_${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET).upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  // --- 画像情報をDBに保存 ---
  const { data, error } = await supabase
    .from("task_images")
    .insert({ task_id: taskId, storage_path: path, file_name: file.name, image_type: imageType })
    .select().single();
  if (error) {
    // DBに登録できなかった場合は孤児ファイルを残さない
    await supabase.storage.from(BUCKET).remove([path]);
    if (error.message?.includes("PLAN_LIMIT")) {
      // DBトリガーによる枚数制限（クライアントの事前チェックをすり抜けた場合）
      const latest = await canUploadImage(plan);
      throw new Error(`PLAN_LIMIT:${latest.current}:${latest.limit}`);
    }
    throw error;
  }
  return data;
}

// --- 画像削除 ---
export async function deleteImage(image: TaskImage): Promise<void> {
  await supabase.storage.from(BUCKET).remove([image.storage_path]);
  await supabase.from("task_images").delete().eq("id", image.id);
}

// --- 画像の署名付きURLを取得（1枚） ---
export async function getSignedImageUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// --- 画像の署名付きURLをまとめて取得（N+1回避）---
// 一覧のサムネイルや詳細モーダルなど、複数枚の画像URLが必要な場面で
// createSignedUrl()を1枚ずつ呼ぶと画像枚数分のリクエストが発生してしまう(N+1)。
// createSignedUrls()で1回のリクエストにまとめて取得する。
export async function getSignedImageUrls(storagePaths: string[]): Promise<Record<string, string>> {
  const uniquePaths = Array.from(new Set(storagePaths));
  if (uniquePaths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET).createSignedUrls(uniquePaths, 3600);
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach(d => {
    if (d.signedUrl && d.path) map[d.path] = d.signedUrl;
  });
  return map;
}

// ---- 課金 ----
// --- Stripeのカスタマーポータル（支払い方法の更新・解約）のURLを取得 ---
export async function openBillingPortal(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error ?? "ポータルを開けませんでした");
  window.location.href = data.url;
}

// ---- アカウント ----
// --- 本人によるアカウント削除（即時）。成功したらサインアウトしてログイン画面へ ---
export async function deleteMyAccount(params: { confirmEmail: string; password?: string }): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "削除に失敗しました");
}

// ---- 管理者用 ----
// --- 管理者がユーザを削除（Stripe解約・画像削除を含む） ---
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
