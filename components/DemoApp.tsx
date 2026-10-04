"use client";

import { useState } from "react";
import ContactModal from "@/components/ContactModal";
import NotificationsModal from "@/components/NotificationsModal";
import { useNotifications } from "@/hooks/useNotifications";
import { useTaskSearch } from "@/hooks/useTaskSearch";
import type { TaskStatus, ImageType } from "@/lib/supabase";
import {
  STATUSES, IMAGE_TYPES, fmtDate, fmtPrice,
  Field, DateField, StatusBadge, TaskListCard, Icon, cx,
} from "@/components/TaskShared";
import { TaskSearchBar } from "@/components/TaskSearchBar";

// ============================================================
// NOTE: ステータス定義・画像タイプ・日付/金額フォーマッタ・Field/DateField/
// StatusBadge・検索条件のロジックとUIは TaskApp.tsx と共通のため、
// components/TaskShared.tsx・hooks/useTaskSearch.ts・
// components/TaskSearchBar.tsx からimportしている。見た目は
// app/globals.css・app/components.css の共通クラスのみで構成する。
//
// 画像アップロード・プラン制限まわりはTaskAppがSupabase Storage・
// 実際の課金プランを使うのに対し、ここは完全にメモリのみ（URL.createObjectURL）
// で完結させているため、意図的に共通化していない。
// ============================================================

// ---- デモ専用の型定義 ----
interface DemoImage {
  id: string;
  objectUrl: string;
  imageType: ImageType;
  fileName: string;
}

interface DemoTask {
  id: string;
  title: string;
  assignee_name: string;
  contact?: string;
  ordered_at?: string;
  deadline?: string;
  submission_date?: string;
  price?: number;
  status: TaskStatus;
  notes?: string;
  images: DemoImage[];
}

type FormValues = {
  title: string; assigneeName: string; contact: string;
  ordered_at: string; deadline: string; submission_date: string;
  price: string; status: TaskStatus; notes: string;
};

const EMPTY_FORM: FormValues = {
  title: "", assigneeName: "", contact: "", ordered_at: "", deadline: "",
  submission_date: "", price: "", status: "pending", notes: "",
};

const DEMO_MAX_IMAGES = 3;

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function DemoImageSection({ task, onChange }: {
  task: DemoTask;
  onChange: (images: DemoImage[]) => void;
}) {
  const [imageType, setImageType] = useState<ImageType>("preview");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const images = task.images;
  const atLimit = images.length >= DEMO_MAX_IMAGES;

  function handleDownload(url: string, fileName: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || atLimit) return;
    const objectUrl = URL.createObjectURL(file);
    onChange([...images, { id: uid(), objectUrl, imageType, fileName: file.name }]);
    e.target.value = "";
  }

  function handleDelete(id: string) {
    const img = images.find(i => i.id === id);
    if (img) URL.revokeObjectURL(img.objectUrl);
    onChange(images.filter(i => i.id !== id));
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="field-label" style={{ marginBottom: 12 }}>添付画像（デモ: 最大{DEMO_MAX_IMAGES}枚）</div>
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 8, marginBottom: 12 }}>
          {images.map(img => {
            const typeLabel = IMAGE_TYPES.find(t => t.key === img.imageType)?.label ?? img.imageType;
            return (
              <div key={img.id} style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-soft)", background: "var(--surface)" }}>
                <img src={img.objectUrl} alt={img.fileName} onClick={() => { setPreview(img.objectUrl); setPreviewFileName(img.fileName); }}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", cursor: "pointer" }} />
                <div className="tag" style={{ position: "absolute", top: 4, left: 4 }}>{typeLabel}</div>
                <button onClick={() => handleDelete(img.id)} className="icon-btn"
                  style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, background: "rgba(0,0,0,0.55)", border: "none" }}>
                  <Icon name="close" size={12} />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDownload(img.objectUrl, img.fileName); }}
                  title="ダウンロード" className="icon-btn"
                  style={{ position: "absolute", bottom: 4, right: 4, width: 22, height: 22, background: "rgba(0,0,0,0.55)", border: "none" }}>
                  <Icon name="download" size={12} />
                </button>
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
          borderStyle: "dashed", cursor: atLimit ? "not-allowed" : "pointer",
          color: atLimit ? "var(--danger)" : "var(--accent)",
        }}>
          {atLimit ? `上限に達しました（${DEMO_MAX_IMAGES}枚）` : "画像を追加"}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={atLimit} style={{ display: "none" }} />
        </label>
      </div>
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(11,11,15,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={preview} alt="preview" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }} />
          <button
            onClick={e => { e.stopPropagation(); handleDownload(preview, previewFileName); }}
            className="btn btn-inverse"
            style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 501 }}>
            <Icon name="download" size={16} /> ダウンロード
          </button>
        </div>
      )}
    </div>
  );
}

export default function DemoApp({ onExit }: { onExit: () => void }) {
  const [tasks, setTasks] = useState<DemoTask[]>([]);
  const search = useTaskSearch(tasks);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingImages, setPendingImages] = useState<DemoImage[]>([]);
  const [pendingImageType, setPendingImageType] = useState<ImageType>("preview");

  const notifications = useNotifications(null, null);

  const filtered = search.filtered;

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => t.status !== "done" && t.status !== "cancelled").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  const detailItem = detailId ? tasks.find(t => t.id === detailId) ?? null : null;

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setPendingImages([]); setPendingImageType("preview"); setShowForm(true); }
  function openEdit(t: DemoTask) {
    setForm({
      title: t.title, assigneeName: t.assignee_name, contact: t.contact ?? "", ordered_at: t.ordered_at ?? "",
      deadline: t.deadline ?? "", submission_date: t.submission_date ?? "",
      price: t.price?.toString() ?? "", status: t.status, notes: t.notes ?? ""
    });
    setEditId(t.id); setShowForm(true); setDetailId(null);
  }

  function handleSave() {
    if (!form.title || !form.assigneeName) return;
    const payload: DemoTask = {
      id: editId ?? uid(),
      title: form.title, assignee_name: form.assigneeName, contact: form.contact || undefined,
      ordered_at: form.ordered_at || undefined, deadline: form.deadline || undefined,
      submission_date: form.submission_date || undefined,
      price: form.price ? Number(form.price) : undefined,
      status: form.status, notes: form.notes || undefined,
      images: editId ? (tasks.find(t => t.id === editId)?.images ?? []) : pendingImages,
    };
    if (editId) {
      setTasks(prev => prev.map(t => t.id === editId ? payload : t));
    } else {
      setTasks(prev => [payload, ...prev]);
    }
    setPendingImages([]);
    setShowForm(false); setEditId(null);
  }

  function handleDelete(id: string) {
    const t = tasks.find(t => t.id === id);
    t?.images.forEach(img => URL.revokeObjectURL(img.objectUrl));
    setTasks(prev => prev.filter(t => t.id !== id));
    setDeleteConfirm(null); setDetailId(null);
  }

  function handleImagesChange(taskId: string, images: DemoImage[]) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, images } : t));
  }

  return (
    <div style={{ minHeight: "100vh" }} onClick={() => setShowUserMenu(false)}>

      {/* デモバナー */}
      <div className="row" style={{
        background: "var(--fg)", color: "var(--bg)",
        justifyContent: "center", padding: "10px 16px", fontSize: 13, fontWeight: 600
      }}>
        デモモード中 — データはリロードで消えます。
        <button onClick={onExit} className="btn btn-inverse btn-sm" style={{ marginLeft: 16 }}>
          登録してはじめる →
        </button>
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>ツクリスト</div>
          <div className="tagline">納期管理</div>
        </div>
        <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 16 }}>
            {[["合計", stats.total], ["進行中", stats.active], ["完成", stats.done]].map(([l, v]) => (
              <div key={l as string} className="stat-block">
                <div className="stat-value">{v}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowContact(true)} className="icon-btn" title="お問い合わせ">
            <Icon name="mail" size={17} />
          </button>
          <button onClick={() => setShowNotifications(true)} className="icon-btn" title="お知らせ">
            <Icon name="bell" size={17} />
          </button>
          <button onClick={openNew} className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> 新規登録
          </button>
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUserMenu(v => !v)}
              className="row" style={{
                gap: 8, background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border-on-inverse)", borderRadius: 999, padding: "6px 12px 6px 6px",
                color: "var(--fg-on-inverse)", fontSize: 13, fontWeight: 600
              }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700
              }}>D</div>
              <span>デモユーザー</span>
              <Icon name="chevronDown" size={13} />
            </button>
            {showUserMenu && (
              <div className="user-menu">
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>デモモード</div>
                  <span className="badge badge-accent">無料プラン相当</span>
                </div>
                <button onClick={onExit} className="user-menu-item accent">
                  アカウント登録する
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <TaskSearchBar search={search} />

      <main className="container" style={{ paddingTop: 20, paddingBottom: 60, maxWidth: 900 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div style={{ color: "var(--meta)", fontSize: 14, marginBottom: 8 }}>タスクがありません</div>
            <div className="text-meta">「＋ 新規登録」からタスクを追加してみてください</div>
          </div>
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
              imageCount={t.images.length}
              thumbnailUrl={t.images[0]?.objectUrl}
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
                    ["金額", fmtPrice(detailItem.price)],
                    ["メモ", detailItem.notes || "—"],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td style={{ padding: "8px 0", color: "var(--muted)", fontWeight: 600, width: 120, verticalAlign: "top" }}>{label}</td>
                      <td style={{ padding: "8px 0", color: "var(--fg)", wordBreak: "break-all" }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DemoImageSection
                task={detailItem}
                onChange={images => handleImagesChange(detailItem.id, images)}
              />
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

      {/* フォームモーダル */}
      {showForm && (
        <div className="modal-overlay" style={{ touchAction: "none" }}
          onClick={() => { pendingImages.forEach(pi => URL.revokeObjectURL(pi.objectUrl)); setPendingImages([]); setShowForm(false); setEditId(null); }}>
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
                    value={form.price ? Number(form.price.replace(/,/g, "")).toLocaleString() : ""}
                    onChange={e => {
                      const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                      setForm({ ...form, price: raw });
                    }}
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

                {!editId && (
                  <Field label="画像（登録後にも追加できます）">
                    {pendingImages.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8, marginBottom: 10 }}>
                        {pendingImages.map(pi => (
                          <div key={pi.id} style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-soft)", background: "var(--surface)" }}>
                            <img src={pi.objectUrl} alt={pi.fileName} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                            <div className="tag" style={{ position: "absolute", top: 3, left: 3 }}>
                              {IMAGE_TYPES.find(t => t.key === pi.imageType)?.label}
                            </div>
                            <button type="button"
                              onClick={() => {
                                URL.revokeObjectURL(pi.objectUrl);
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
                      <select value={pendingImageType} onChange={e => setPendingImageType(e.target.value as ImageType)}
                        className="select" style={{ width: "auto", padding: "8px 12px" }}>
                        {IMAGE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                      <label className={cx("btn", "btn-secondary", "grow")} style={{
                        borderStyle: "dashed",
                        cursor: pendingImages.length >= DEMO_MAX_IMAGES ? "not-allowed" : "pointer",
                        color: pendingImages.length >= DEMO_MAX_IMAGES ? "var(--danger)" : "var(--accent)",
                      }}>
                        {pendingImages.length >= DEMO_MAX_IMAGES ? `上限（${DEMO_MAX_IMAGES}枚）` : "画像を追加"}
                        <input type="file" accept="image/*" disabled={pendingImages.length >= DEMO_MAX_IMAGES} style={{ display: "none" }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const objectUrl = URL.createObjectURL(file);
                            setPendingImages(prev => [...prev, { id: uid(), objectUrl, imageType: pendingImageType, fileName: file.name }]);
                            e.target.value = "";
                          }} />
                      </label>
                    </div>
                    {pendingImages.length > 0 && (
                      <div className="text-meta" style={{ marginTop: 6 }}>※ 登録ボタンを押すと画像も一緒に保存されます</div>
                    )}
                  </Field>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <div className="row" style={{ gap: 10, marginTop: 16 }}>
                <button onClick={() => {
                  pendingImages.forEach(pi => URL.revokeObjectURL(pi.objectUrl));
                  setPendingImages([]);
                  setShowForm(false); setEditId(null);
                }} className="btn btn-secondary" style={{ flex: 1 }}>キャンセル</button>
                <button onClick={handleSave} disabled={!form.title || !form.assigneeName} className="btn btn-primary" style={{ flex: 2 }}>
                  {editId ? "更新する" : pendingImages.length > 0 ? `登録する（画像${pendingImages.length}枚）` : "登録する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
