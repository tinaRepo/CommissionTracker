"use client";

import { useState, useEffect, useMemo } from "react";
import {
  supabase, requestDeleteAccount, fetchTasks, createTask, updateTask,
  deleteTask, uploadImage, deleteImage, getSignedImageUrls,
  fetchMyProfile, canUploadImage,
  PLAN_LIMITS,
  type Task, type TaskStatus, type TaskImage,
  type ImageType, type UserProfile, type Plan,
  fetchTaskById,
  changeMyPassword, requestSetPasswordEmail, toJapaneseAuthError,
  linkGoogleAccount, unlinkGoogleAccount, hasGoogleIdentity,
  PASSWORD_MIN_LENGTH,
} from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useNotifications } from "@/hooks/useNotifications";
import { useTaskSearch } from "@/hooks/useTaskSearch";
import {
  STATUSES, IMAGE_TYPES, fmtDate, fmtPrice,
  Field, DateField, StatusBadge, TaskListCard, Icon, cx,
} from "./TaskShared";
import { TaskSearchBar } from "./TaskSearchBar";
import PushNotificationToggle from "./PushNotificationToggle";
const NotificationsModal = dynamic(() => import("./NotificationsModal"), { ssr: false });
const ContactModal = dynamic(() => import("./ContactModal"), { ssr: false });
const InstallPromptBanner = dynamic(() => import("./InstallPromptBanner"), { ssr: false });

// --- 画像アップロード前のプラン制限チェック ---
type FormValues = {
  title: string; assigneeName: string; contact: string; ordered_at: string;
  deadline: string; price: string; currency: string;
  status: TaskStatus; submission_date: string; notes: string;
};

// 新規登録時に仮保持する画像キュー
type PendingImage = {
  id: string;
  file: File;
  imageType: ImageType;
  previewUrl: string;
};

const EMPTY_FORM: FormValues = {
  title: "", assigneeName: "", contact: "", ordered_at: "", deadline: "",
  price: "", currency: "JPY", status: "pending", submission_date: "", notes: "",
};

// --- プランバッジ ---
function PlanBadge({ plan }: { plan: Plan }) {
  const p = PLAN_LIMITS[plan];
  return (
    <span className="badge" style={{ background: p.bg, color: p.color }}>
      {p.label}
    </span>
  );
}

// ---- 画像使用量バー ----
function ImageUsageBar({ plan, imageCount }: { plan: Plan; imageCount: number }) {
  const limit = PLAN_LIMITS[plan].imageLimit;
  if (limit === null) {
    return (
      <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>
        画像 {imageCount}枚（無制限）
      </div>
    );
  }
  const pct = Math.min((imageCount / limit) * 100, 100);
  const color = pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--warn)" : "var(--accent)";
  return (
    <div style={{ minWidth: 130 }}>
      <div className="row" style={{ justifyContent: "space-between", fontSize: 11, color: "var(--muted-on-inverse)", marginBottom: 4 }}>
        <span>画像 {imageCount} / {limit}枚</span>
        <span style={{ color, fontWeight: 700 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.14)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ---- 画像セクション ----
function ImageSection({ task, plan, onUpdated }: {
  task: Task; plan: Plan; onUpdated: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState<number>(task.images?.length ?? 0);
  useEffect(() => {
    setPrevCount(task.images?.length ?? 0);
  }, [task.id]);
  useEffect(() => {
    const currentCount = task.images?.length ?? 0;
    if (prevCount !== currentCount) {
      if (currentCount > prevCount) {
        setToast(`画像をアップロードしました（最新枚数: ${currentCount}枚）`);
      } else if (currentCount < prevCount) {
        setToast(`画像を削除しました（最新枚数: ${currentCount}枚）`);
      }
      setTimeout(() => setToast(null), 3000);
      setPrevCount(currentCount);
    }
  }, [task.images?.length]);
  const [imageType, setImageType] = useState<ImageType>("preview");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [limitError, setLimitError] = useState<string | null>(null);

  async function handleDownload(url: string, fileName: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("ダウンロードに失敗しました");
    }
  }

  useEffect(() => {
    const images = task.images ?? [];
    if (!images.length) { setSignedUrls({}); return; }
    getSignedImageUrls(images.map(img => img.storage_path))
      .then(pathToUrl => {
        const byId: Record<string, string> = {};
        images.forEach(img => {
          const url = pathToUrl[img.storage_path];
          if (url) byId[img.id] = url;
        });
        setSignedUrls(byId);
      })
      .catch(() => setSignedUrls({}));
  }, [task.images]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLimitError(null);
    setUploading(true);
    try {
      await uploadImage(task.id, file, imageType, plan);
    } catch (err: any) {
      if (err.message?.startsWith("PLAN_LIMIT:")) {
        const [, current, limit] = err.message.split(":");
        const planLabel = PLAN_LIMITS[plan].label;
        setLimitError(`${planLabel}プランの上限（${limit}枚）に達しています（現在${current}枚）`);
      } else {
        alert("アップロードに失敗しました");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
      onUpdated();
      setTimeout(() => {
        setToast(`画像をアップロードしました（最新枚数: ${(task.images?.length ?? 0) + 1}枚）`);
        setTimeout(() => setToast(null), 3000);
      }, 500);
    }
  }

  async function handleDelete(img: TaskImage) {
    if (!confirm(`「${img.file_name}」を削除しますか？`)) return;
    await deleteImage(img);
    onUpdated();
    setTimeout(() => {
      setToast(`画像を削除しました（最新枚数: ${(task.images?.length ?? 0) - 1}枚）`);
      setTimeout(() => setToast(null), 3000);
    }, 500);
  }

  const images = task.images ?? [];
  const limit = PLAN_LIMITS[plan].imageLimit;
  const atLimit = limit !== null && images.length >= limit;

  return (
    <div style={{ marginTop: 24 }}>
      <div className="field-label" style={{ marginBottom: 12 }}>添付画像</div>

      {limitError && (
        <div className="row" style={{
          marginBottom: 10, padding: "10px 14px", background: "var(--danger-soft)",
          borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--danger)", gap: 6,
        }}>
          {limitError}
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>プランをアップグレードすると追加できます</span>
        </div>
      )}

      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 8, marginBottom: 12 }}>
          {images.map(img => {
            const url = signedUrls[img.id];
            const typeLabel = IMAGE_TYPES.find(t => t.key === img.image_type)?.label ?? img.image_type;
            return (
              <div key={img.id} style={{
                position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden",
                border: "1px solid var(--border-soft)", background: "var(--surface)"
              }}>
                {url ? (
                  <img src={url} alt={img.file_name} onClick={() => { setPreview(url); setPreviewFileName(img.file_name); }}
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", cursor: "pointer" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1" }} />
                )}
                <div className="tag" style={{ position: "absolute", top: 4, left: 4 }}>{typeLabel}</div>
                <button onClick={() => handleDelete(img)}
                  className="icon-btn" style={{
                    position: "absolute", top: 4, right: 4, width: 22, height: 22,
                    background: "rgba(0,0,0,0.55)", border: "none",
                  }}>
                  <Icon name="close" size={12} />
                </button>
                {url && (
                  <button onClick={e => { e.stopPropagation(); handleDownload(url, img.file_name); }}
                    title="ダウンロード"
                    className="icon-btn" style={{
                      position: "absolute", bottom: 4, right: 4, width: 22, height: 22,
                      background: "rgba(0,0,0,0.55)", border: "none",
                    }}>
                    <Icon name="download" size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select value={imageType} onChange={e => setImageType(e.target.value as ImageType)}
          className="select" style={{ width: "auto", padding: "8px 12px" }}>
          {IMAGE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <label className={cx("btn", "btn-secondary", "grow")} style={{
          borderStyle: "dashed", cursor: (uploading || atLimit) ? "not-allowed" : "pointer",
          color: atLimit ? "var(--danger)" : "var(--accent)",
        }}>
          {uploading ? "アップロード中…" : atLimit ? `上限に達しました（${limit}枚）` : "画像を追加"}
          <input type="file" accept="image/*" onChange={handleUpload}
            disabled={uploading || atLimit} style={{ display: "none" }} />
        </label>
      </div>

      {preview && (
        <div onClick={() => setPreview(null)} style={{
          position: "fixed", inset: 0, background: "rgba(11,11,15,0.85)",
          zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out"
        }}>
          <img src={preview} alt="preview"
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }} />
          <button
            onClick={e => { e.stopPropagation(); handleDownload(preview, previewFileName); }}
            className="btn btn-inverse"
            style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 501 }}>
            <Icon name="download" size={16} /> ダウンロード
          </button>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ---- メインアプリ ----
export default function TaskApp() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [imageCount, setImageCount] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const search = useTaskSearch(tasks);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingImageType, setPendingImageType] = useState<ImageType>("preview");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteRequesting, setDeleteRequesting] = useState(false);
  const [deleteRequestDone, setDeleteRequestDone] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);
  const [showUnlinkWarning, setShowUnlinkWarning] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login";
      } else {
        setUser(session.user);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        window.location.href = "/login";
      } else {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function load() {
    try {
      const [data, prof] = await Promise.all([fetchTasks(), fetchMyProfile()]);
      setTasks(data);
      setProfile(prof);
      const total = data.reduce((sum, t) => sum + (t.images?.length ?? 0), 0);
      setImageCount(total);

      setLoading(false);

      const firstImagePaths = data
        .map(t => t.images?.[0]?.storage_path)
        .filter((p): p is string => !!p);
      if (firstImagePaths.length === 0) { setThumbnailUrls({}); return; }
      try {
        const pathToUrl = await getSignedImageUrls(firstImagePaths);
        const byTaskId: Record<string, string> = {};
        data.forEach(t => {
          const path = t.images?.[0]?.storage_path;
          if (path && pathToUrl[path]) byTaskId[t.id] = pathToUrl[path];
        });
        setThumbnailUrls(byTaskId);
      } catch {
        setThumbnailUrls({});
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  useEffect(() => { if (user) load(); }, [user]);

  const notifications = useNotifications(user?.id ?? null, profile?.created_at ?? null, profile?.plan ?? null);

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    const u = session?.user;
    if (!u) return;
    await supabase.from("user_profiles").update({ display_name: nameInput.trim() }).eq("id", u.id);
    await load();
    setShowNameEdit(false);
    setShowUserMenu(false);
  }

  async function handleDeleteRequest() {
    setDeleteRequesting(true);
    try {
      await requestDeleteAccount();
      setDeleteRequestDone(true);
    } catch (e: any) {
      alert(e.message ?? "送信に失敗しました");
    } finally {
      setDeleteRequesting(false);
    }
  }

  function openPasswordModal() {
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
    setPwError(null); setPwDone(false);
    setShowPasswordModal(true); setShowUserMenu(false);
  }

  async function handleSavePassword() {
    setPwError(null);
    setPwSaving(true);
    try {
      if (hasPassword) {
        if (pwNew.length < PASSWORD_MIN_LENGTH) { setPwError(`パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`); setPwSaving(false); return; }
        if (pwNew !== pwConfirm) { setPwError("新しいパスワードが一致しません"); setPwSaving(false); return; }
        if (!pwCurrent) { setPwError("現在のパスワードを入力してください"); setPwSaving(false); return; }
        await changeMyPassword(pwNew, pwCurrent);
      } else {
        await requestSetPasswordEmail();
      }
      setPwDone(true);
    } catch (e: any) {
      setPwError(toJapaneseAuthError(e.message ?? "処理に失敗しました"));
    } finally {
      setPwSaving(false);
    }
  }

  async function handleLinkGoogle() {
    setLinking(true);
    try {
      await linkGoogleAccount();
    } catch (e: any) {
      alert(e.message ?? "連携に失敗しました");
      setLinking(false);
    }
  }

  function requestUnlinkGoogle() {
    setShowUserMenu(false);
    setShowUnlinkWarning(true);
  }

  async function handleUnlinkGoogle() {
    setUnlinking(true);
    try {
      await unlinkGoogleAccount(user!);
      setShowUnlinkWarning(false);
      await supabase.auth.refreshSession();
      const { data: { user: refreshed } } = await supabase.auth.getUser();
      setUser(refreshed);
    } catch (e: any) {
      const isIdentityCountError = e.message?.toLowerCase().includes("at least 1 identity");
      alert(
        isIdentityCountError
          ? "解除できませんでした。一度ログアウトし、メールアドレスとパスワードで再ログインしてから再度お試しください。"
          : (e.message ?? "解除に失敗しました")
      );
    } finally {
      setUnlinking(false);
    }
  }

  function requestLogout() {
    setShowUserMenu(false);
    if (!hasPassword && !isGoogleLinked) {
      setShowLogoutWarning(true);
    } else {
      handleLogout();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const filtered = search.filtered;

  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter(t => t.status !== "done" && t.status !== "cancelled").length,
    done: tasks.filter(t => t.status === "done").length,
  }), [tasks]);

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setPendingImages([]); setPendingImageType("preview"); setShowForm(true); }
  function openEdit(t: Task) {
    setForm({
      title: t.title, assigneeName: t.assignee_name, contact: t.contact ?? "", ordered_at: t.ordered_at ?? "",
      deadline: t.deadline ?? "", price: t.price?.toString() ?? "", currency: t.currency,
      status: t.status, submission_date: t.submission_date ?? "", notes: t.notes ?? ""
    });
    setEditId(t.id); setShowForm(true); setDetailId(null);
  }

  async function handleSave() {
    if (!form.title || !form.assigneeName) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title, assignee_name: form.assigneeName, contact: form.contact || undefined,
        ordered_at: form.ordered_at || undefined, deadline: form.deadline || undefined,
        price: form.price ? Number(form.price) : undefined, currency: form.currency,
        status: form.status, submission_date: form.submission_date || undefined, notes: form.notes || undefined,
      };
      if (editId) {
        await updateTask(editId, payload);
      } else {
        const newTask = await createTask(payload);
        if (pendingImages.length > 0) {
          for (const pi of pendingImages) {
            try {
              await uploadImage(newTask.id, pi.file, pi.imageType, plan);
            } catch { /* 1枚失敗しても続行 */ }
            URL.revokeObjectURL(pi.previewUrl);
          }
          setPendingImages([]);
        }
      }
      await load();
      if (detailId) {
        fetchTaskById(detailId).then(setDetailItem).catch(() => setDetailItem(null));
      }
      setShowForm(false); setEditId(null);
    } catch { alert("保存に失敗しました"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      await load();
      if (detailId) {
        fetchTaskById(detailId).then(setDetailItem).catch(() => setDetailItem(null));
      }
    }
    catch { alert("削除に失敗しました"); }
    setDeleteConfirm(null); setDetailId(null);
  }

  useEffect(() => {
    if (!detailId) {
      setDetailItem(null);
      return;
    }
    const item = tasks.find(t => t.id === detailId) ?? null;
    setDetailItem(item);
  }, [detailId, tasks]);

  useEffect(() => {
    if (showForm || detailId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showForm, detailId]);
  const plan = (profile?.plan ?? "free") as Plan;
  const lastProvider = profile?.last_login_provider ?? null;
  const hasPassword = profile?.has_password ?? true;
  const isGoogleLinked = hasGoogleIdentity(user);
  const displayName = profile?.display_name;
  const userLabel = displayName ?? user?.user_metadata?.full_name ?? (user?.email?.split("@")[0]) ?? "ユーザー";
  const userAvatar = user?.user_metadata?.avatar_url as string | undefined;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--accent)", fontSize: 15, fontWeight: 600 }}>読み込み中…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh" }} onClick={() => setShowUserMenu(false)}>

      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>ツクリスト</div>
          <div className="tagline">納期管理</div>
        </div>

        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          {/* 統計 */}
          <div className="row" style={{ gap: 16 }}>
            {[["合計", stats.total], ["進行中", stats.active], ["完成", stats.done]].map(([l, v]) => (
              <div key={l as string} className="stat-block">
                <div className="stat-value">{v}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>

          {/* 画像使用量 */}
          {profile && (
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-md)", padding: "8px 14px" }}>
              <ImageUsageBar plan={plan} imageCount={imageCount} />
            </div>
          )}

          <button onClick={() => setShowContact(true)} className="icon-btn" title="お問い合わせ">
            <Icon name="mail" size={17} />
          </button>

          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotifications(true)} className="icon-btn" title="お知らせ">
              <Icon name="bell" size={17} />
            </button>
            {notifications.unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -3, right: -3,
                minWidth: 16, height: 16, borderRadius: 999,
                background: "var(--danger)", color: "#fff",
                fontSize: 9, fontWeight: 700, lineHeight: "16px",
                textAlign: "center", padding: "0 3px", pointerEvents: "none",
              }}>
                {notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}
              </span>
            )}
          </div>

          <button onClick={openNew} className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> 新規登録
          </button>

          {/* ユーザーメニュー */}
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUserMenu(v => !v)}
              className="row" style={{
                gap: 8, background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border-on-inverse)", borderRadius: 999, padding: "6px 12px 6px 6px",
                color: "var(--fg-on-inverse)", fontSize: 13, fontWeight: 600
              }}>
              <span style={{ position: "relative", display: "inline-flex" }}>
                {userAvatar ? (
                  <img src={userAvatar} alt="avatar" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700
                  }}>
                    {userLabel.charAt(0).toUpperCase()}
                  </div>
                )}
                {lastProvider === "google" && (
                  <span title="前回はGoogleでログイン" style={{
                    position: "absolute", bottom: -2, right: -2,
                    width: 13, height: 13, borderRadius: "50%",
                    background: "#fff", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 900, color: "#4285f4",
                  }}>G</span>
                )}
              </span>
              <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userLabel}</span>
              <Icon name="chevronDown" size={13} />
            </button>
            {showUserMenu && (
              <div className="user-menu">
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
                  {profile && <PlanBadge plan={profile.plan} />}
                </div>
                <button onClick={() => window.location.href = "/pricing"} className="user-menu-item accent">
                  プランをアップグレード
                </button>
                <PushNotificationToggle />
                <button onClick={() => { setNameInput(profile?.display_name ?? ""); setShowNameEdit(true); setShowUserMenu(false); }}
                  className="user-menu-item">
                  名前を変更
                </button>
                <button onClick={openPasswordModal} className="user-menu-item">
                  {hasPassword ? "パスワードを変更" : "パスワードを設定"}
                </button>
                {isGoogleLinked ? (
                  <button onClick={requestUnlinkGoogle} className="user-menu-item">
                    Google連携を解除
                  </button>
                ) : (
                  <button onClick={handleLinkGoogle} disabled={linking} className="user-menu-item">
                    {linking ? "連携中…" : "Googleと連携する"}
                  </button>
                )}
                {profile?.is_admin && (
                  <button onClick={() => window.location.href = "/mgmt-c7f2a91e"} className="user-menu-item accent">
                    管理者ページ
                  </button>
                )}
                {!profile?.is_admin && (
                  <button onClick={() => { setShowDeleteRequest(true); setShowUserMenu(false); }}
                    className="user-menu-item danger">
                    アカウント削除を申請
                  </button>
                )}
                <button onClick={requestLogout} className="user-menu-item danger" style={{ fontWeight: 700 }}>
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* フィルタ＋ソート＋詳細検索パネル（TaskApp/DemoApp共通コンポーネント） */}
      <TaskSearchBar search={search} />

      {/* リスト */}
      <main className="container" style={{ paddingTop: 20, paddingBottom: 60, maxWidth: 900 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--meta)", marginTop: 60, fontSize: 14 }}>タスクがありません</div>
        )}
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(t => (
            <TaskListCard
              key={t.id}
              title={t.title}
              assigneeName={t.assignee_name}
              contact={t.contact}
              status={t.status}
              deadline={t.deadline}
              price={t.price}
              imageCount={t.images?.length ?? 0}
              thumbnailUrl={thumbnailUrls[t.id]}
              onClick={() => setDetailId(t.id)}
            />
          ))}
        </div>
      </main>

      {/* 詳細モーダル */}
      {detailItem && (
        <div className="modal-overlay" style={{ touchAction: "none" }} onClick={() => setDetailId(null)}>
          <div className="modal-sheet" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 19, marginBottom: 8 }}>{detailItem.title}</div>
                  <StatusBadge status={detailItem.status} />
                </div>
                <button onClick={() => setDetailId(null)} className="icon-btn"
                  style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", color: "var(--fg)" }}>
                  <Icon name="close" size={14} />
                </button>
              </div>
            </div>
            <div className="modal-body">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {[
                    ["依頼先名", detailItem.assignee_name],
                    ["SNS/連絡先", detailItem.contact || "—"],
                    ["依頼日", fmtDate(detailItem.ordered_at)],
                    ["納期", fmtDate(detailItem.deadline)],
                    ["提出日", fmtDate(detailItem.submission_date)],
                    ["金額", fmtPrice(detailItem.price, detailItem.currency)],
                    ["メモ", detailItem.notes || "—"],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td style={{ padding: "8px 0", color: "var(--muted)", fontWeight: 600, width: 120, verticalAlign: "top" }}>{label}</td>
                      <td style={{ padding: "8px 0", color: "var(--fg)", wordBreak: "break-all" }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ImageSection task={detailItem} plan={plan} onUpdated={load} />
            </div>
            <div className="modal-footer">
              <div className="row" style={{ gap: 10, marginTop: 16 }}>
                <button onClick={() => openEdit(detailItem)} className="btn btn-primary" style={{ flex: 1 }}>編集</button>
                <button onClick={() => setDeleteConfirm(detailItem.id)} className="btn btn-danger" style={{ flex: 1 }}>削除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アカウント削除申請モーダル */}
      {showDeleteRequest && (
        <div className="modal-overlay" onClick={() => { if (!deleteRequesting) { setShowDeleteRequest(false); setDeleteRequestDone(false); } }}>
          <div className="modal-compact" onClick={e => e.stopPropagation()}>
            {deleteRequestDone ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 12 }}>申請を送信しました</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>
                  管理者にメールで通知しました。<br />
                  削除が完了するまで少しお待ちください。
                </div>
                <button onClick={() => { setShowDeleteRequest(false); setDeleteRequestDone(false); }} className="btn btn-primary btn-block">
                  閉じる
                </button>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 12 }}>アカウント削除を申請する</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>
                  管理者にメールで削除申請を送ります。<br />
                  削除されると<strong style={{ color: "var(--fg)" }}>すべてのデータが失われます。</strong>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button onClick={() => setShowDeleteRequest(false)} disabled={deleteRequesting} className="btn btn-secondary" style={{ flex: 1 }}>
                    キャンセル
                  </button>
                  <button onClick={handleDeleteRequest} disabled={deleteRequesting} className="btn btn-danger-solid" style={{ flex: 1 }}>
                    {deleteRequesting ? "送信中…" : "申請する"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 名前編集モーダル */}
      {showNameEdit && (
        <div className="modal-overlay" onClick={() => setShowNameEdit(false)}>
          <div className="modal-compact" style={{ maxWidth: 360, textAlign: "left" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20 }}>表示名を変更</div>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
              placeholder="例: 山田太郎"
              maxLength={30}
              className="input"
              style={{ marginBottom: 16 }}
            />
            <div className="row" style={{ gap: 10 }}>
              <button onClick={() => setShowNameEdit(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                キャンセル
              </button>
              <button onClick={handleSaveName} disabled={!nameInput.trim()} className="btn btn-primary" style={{ flex: 2 }}>
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 連携解除の警告モーダル */}
      {showUnlinkWarning && (
        <div className="modal-overlay" onClick={() => !unlinking && setShowUnlinkWarning(false)}>
          <div className="modal-compact" style={{ maxWidth: 400, textAlign: "left" }} onClick={e => e.stopPropagation()}>
            {!hasPassword ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, textAlign: "center" }}>
                  現在Googleアカウントが唯一のログイン手段です
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8, marginBottom: 22 }}>
                  他のログイン手段が無いため、このままではGoogle連携を解除できません。
                  解除するには、先に<strong style={{ color: "var(--fg)" }}>パスワードを設定</strong>していただくか、
                  利用をやめる場合は<strong style={{ color: "var(--fg)" }}>アカウント削除を申請</strong>してください。
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <button onClick={() => { setShowUnlinkWarning(false); openPasswordModal(); }} className="btn btn-primary btn-block">
                    パスワードを設定する
                  </button>
                  <button onClick={() => { setShowUnlinkWarning(false); setShowDeleteRequest(true); }} className="btn btn-danger btn-block">
                    アカウント削除を申請する
                  </button>
                  <button onClick={() => setShowUnlinkWarning(false)} className="btn btn-secondary btn-block">
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, textAlign: "center" }}>
                  Google連携を解除しますか？
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 20, textAlign: "center" }}>
                  解除後もメールアドレスとパスワードでログインできます。
                </div>
                <div style={{
                  fontSize: 12, color: "var(--warn)", lineHeight: 1.7, marginBottom: 20,
                  background: "var(--warn-soft)", borderRadius: "var(--radius-md)", padding: "12px 14px"
                }}>
                  直近でパスワードを設定した場合、稀に解除がうまく反映されないことがあります。
                  その場合は一度<strong>ログアウトし、メールアドレスとパスワードで再ログイン</strong>してから、
                  もう一度お試しください。
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button onClick={() => setShowUnlinkWarning(false)} disabled={unlinking} className="btn btn-secondary" style={{ flex: 1 }}>
                    キャンセル
                  </button>
                  <button onClick={handleUnlinkGoogle} disabled={unlinking} className="btn btn-danger-solid" style={{ flex: 1 }}>
                    {unlinking ? "解除中…" : "解除する"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* パスワード設定/変更モーダル */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => !pwSaving && setShowPasswordModal(false)}>
          <div className="modal-compact" style={{ maxWidth: 380, textAlign: "left" }} onClick={e => e.stopPropagation()}>
            {pwDone ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10, textAlign: "center" }}>
                  {hasPassword ? "パスワードを変更しました" : "設定用メールを送信しました"}
                </div>
                {!hasPassword && (
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 20, textAlign: "center" }}>
                    メール内のリンクから新しいパスワードを設定してください。<br />
                    設定が完了すると、次回からメールアドレスとパスワードでもログインできます。
                  </div>
                )}
                <button onClick={() => setShowPasswordModal(false)} className="btn btn-primary btn-block">
                  閉じる
                </button>
              </>
            ) : hasPassword ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>パスワードを変更</div>
                {pwError && (
                  <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, background: "var(--danger-soft)", color: "var(--danger)" }}>
                    {pwError}
                  </div>
                )}
                <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                  <input type="password" placeholder="現在のパスワード" value={pwCurrent}
                    onChange={e => setPwCurrent(e.target.value)} autoComplete="current-password" className="input" />
                  <input type="password" placeholder={`新しいパスワード（${PASSWORD_MIN_LENGTH}文字以上）`} value={pwNew}
                    onChange={e => setPwNew(e.target.value)} minLength={PASSWORD_MIN_LENGTH} className="input" />
                  <input type="password" placeholder="新しいパスワード（確認）" value={pwConfirm}
                    onChange={e => setPwConfirm(e.target.value)} className="input" />
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button onClick={() => setShowPasswordModal(false)} disabled={pwSaving} className="btn btn-secondary" style={{ flex: 1 }}>
                    キャンセル
                  </button>
                  <button
                    onClick={handleSavePassword}
                    disabled={pwSaving || pwNew.length < PASSWORD_MIN_LENGTH || pwNew !== pwConfirm || !pwCurrent}
                    className="btn btn-primary" style={{ flex: 2 }}>
                    {pwSaving ? "処理中…" : "変更する"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>パスワードを設定</div>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
                  現在Googleアカウントでログインしています。設定用のメールを送信しますので、
                  メール内のリンクから新しいパスワードを設定してください。
                  設定すると、次回からメールアドレスとパスワードでもログインできるようになります。
                </p>
                {pwError && (
                  <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, background: "var(--danger-soft)", color: "var(--danger)" }}>
                    {pwError}
                  </div>
                )}
                <div className="row" style={{ gap: 10 }}>
                  <button onClick={() => setShowPasswordModal(false)} disabled={pwSaving} className="btn btn-secondary" style={{ flex: 1 }}>
                    キャンセル
                  </button>
                  <button onClick={handleSavePassword} disabled={pwSaving} className="btn btn-primary" style={{ flex: 2 }}>
                    {pwSaving ? "送信中…" : "設定用メールを送信する"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-compact" style={{ maxWidth: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>本当に削除しますか？</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>この操作は元に戻せません。</div>
            <div className="row" style={{ gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary" style={{ flex: 1 }}>キャンセル</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-danger-solid" style={{ flex: 1 }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* ログアウトの警告モーダル */}
      {showLogoutWarning && (
        <div className="modal-overlay" onClick={() => setShowLogoutWarning(false)}>
          <div className="modal-compact" style={{ maxWidth: 400, textAlign: "left" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, textAlign: "center" }}>
              ログアウトしますか？
            </div>
            <div style={{
              fontSize: 13, color: "var(--danger)", lineHeight: 1.8, marginBottom: 20,
              background: "var(--danger-soft)", borderRadius: "var(--radius-md)", padding: "14px 16px"
            }}>
              <strong>このアカウントはパスワード未設定・Google連携もされていません。</strong><br />
              ログアウトすると、再度ログインする手段がなくなる可能性があります。<br />
              先に「パスワードを設定」または「Googleと連携する」ことを強く推奨します。
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button onClick={() => setShowLogoutWarning(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                キャンセル
              </button>
              <button onClick={handleLogout} className="btn btn-danger-solid" style={{ flex: 1 }}>
                それでもログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フォームモーダル */}
      {showForm && (
        <div className="modal-overlay" style={{ touchAction: "none" }}
          onClick={() => { pendingImages.forEach(pi => URL.revokeObjectURL(pi.previewUrl)); setPendingImages([]); setShowForm(false); setEditId(null); }}>
          <div className="modal-sheet" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ fontWeight: 700, fontSize: 19, marginBottom: 12 }}>
                {editId ? "タスクを編集" : "新規タスクを登録"}
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gap: 16, paddingBottom: 8 }}>
                <Field label="件名 *"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例: 名刺デザイン一式" className="input" /></Field>
                <Field label="依頼先名 *"><input value={form.assigneeName} onChange={e => setForm({ ...form, assigneeName: e.target.value })} placeholder="例: 田中デザイン事務所" className="input" /></Field>
                <Field label="SNS/連絡先（X ID等）"><input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="例: @your_handle" className="input" /></Field>
                <DateField label="依頼日" value={form.ordered_at} onChange={v => setForm({ ...form, ordered_at: v })} />
                <DateField label="納期" value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} />
                <DateField label="提出日" value={form.submission_date} onChange={v => setForm({ ...form, submission_date: v })} />
                <Field label="金額（円）">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.price ? Number(form.price).toLocaleString("ja-JP") : ""}
                    onChange={e => {
                      const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                      setForm({ ...form, price: raw });
                    }}
                    onFocus={e => { e.target.value = form.price; }}
                    onBlur={e => { if (form.price) { e.target.value = Number(form.price).toLocaleString("ja-JP"); } }}
                    placeholder="例: 5,000"
                    className="input"
                  />
                </Field>
                <Field label="ステータス">
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })} className="select">
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="メモ">
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="仕様の指定や注意点など" className="textarea" style={{ minHeight: 70 }} />
                </Field>

                {!editId && (() => {
                  const limit = PLAN_LIMITS[plan].imageLimit;
                  const currentTotal = imageCount;
                  const pendingCount = pendingImages.length;
                  const totalAfter = currentTotal + pendingCount;
                  const atLimit = limit !== null && totalAfter >= limit;
                  return (
                    <Field label="画像（登録後にも追加できます）">
                      {pendingImages.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8, marginBottom: 10 }}>
                          {pendingImages.map(pi => (
                            <div key={pi.id} style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-soft)", background: "var(--surface)" }}>
                              <img src={pi.previewUrl} alt={pi.file.name}
                                style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                              <div className="tag" style={{ position: "absolute", top: 3, left: 3 }}>
                                {IMAGE_TYPES.find(t => t.key === pi.imageType)?.label}
                              </div>
                              <button type="button"
                                onClick={() => {
                                  URL.revokeObjectURL(pi.previewUrl);
                                  setPendingImages(prev => prev.filter(x => x.id !== pi.id));
                                }}
                                className="icon-btn" style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, background: "rgba(0,0,0,0.55)", border: "none" }}>
                                <Icon name="close" size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <select
                          value={pendingImageType}
                          onChange={e => setPendingImageType(e.target.value as ImageType)}
                          className="select" style={{ width: "auto", padding: "8px 12px" }}>
                          {IMAGE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                        <label className={cx("btn", "btn-secondary", "grow")} style={{
                          borderStyle: "dashed", cursor: atLimit ? "not-allowed" : "pointer",
                          color: atLimit ? "var(--danger)" : "var(--accent)",
                        }}>
                          {atLimit ? `上限に達しています（${limit}枚）` : "画像を追加"}
                          <input type="file" accept="image/*" disabled={atLimit} style={{ display: "none" }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const previewUrl = URL.createObjectURL(file);
                              setPendingImages(prev => [...prev, {
                                id: `${Date.now()}-${Math.random()}`,
                                file,
                                imageType: pendingImageType,
                                previewUrl,
                              }]);
                              e.target.value = "";
                            }} />
                        </label>
                      </div>
                      {pendingImages.length > 0 && (
                        <div className="text-meta" style={{ marginTop: 6 }}>
                          ※ 登録ボタンを押すと画像もまとめてアップロードされます
                        </div>
                      )}
                    </Field>
                  );
                })()}
              </div>
            </div>
            <div className="modal-footer">
              <div className="row" style={{ gap: 10, marginTop: 16 }}>
                <button onClick={() => {
                  pendingImages.forEach(pi => URL.revokeObjectURL(pi.previewUrl));
                  setPendingImages([]);
                  setShowForm(false); setEditId(null);
                }} className="btn btn-secondary" style={{ flex: 1 }}>キャンセル</button>
                <button onClick={handleSave} disabled={!form.title || !form.assigneeName || saving} className="btn btn-primary" style={{ flex: 2 }}>
                  {saving
                    ? (pendingImages.length > 0 && !editId ? `登録・画像アップロード中…` : "保存中…")
                    : editId ? "更新する" : pendingImages.length > 0 ? `登録する（画像${pendingImages.length}枚）` : "登録する"
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ContactModal open={showContact} onClose={() => setShowContact(false)} />

      <NotificationsModal
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        announcements={notifications.announcements}
        releases={notifications.releases}
        unreadAnnouncementIds={notifications.unreadAnnouncementIds}
        hasUnreadRelease={notifications.hasUnreadRelease}
        loading={notifications.loading}
        onMarkAnnouncementRead={notifications.markAnnouncementRead}
        onMarkReleasesRead={notifications.markReleasesRead}
      />

      <InstallPromptBanner />

      {/* フッター */}
      <footer className="app-footer">
        <div className="footer-links">
          {[
            { href: "/lp", label: "サービス紹介" },
            { href: "/guide", label: "使い方" },
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシーポリシー" },
            { href: "/tokusho", label: "特定商取引法" },
          ].map(link => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>
        <div className="text-meta" style={{ marginTop: 10 }}>© 2026 ツクリスト</div>
      </footer>
    </div>
  );
}
