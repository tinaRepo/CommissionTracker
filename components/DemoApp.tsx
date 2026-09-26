"use client";

import { useState } from "react";
import ContactModal from "@/components/ContactModal";
import NotificationsModal from "@/components/NotificationsModal";
import { useNotifications } from "@/hooks/useNotifications";
import { useCommissionSearch } from "@/hooks/useCommissionSearch";
import type { CommissionStatus, ImageType } from "@/lib/supabase";
import {
  STATUSES, IMAGE_TYPES, fmtDate, fmtPrice,
  inp, inp_date, Field, DateField, StatusBadge, CommissionListCard,
} from "@/components/CommissionShared";
import { CommissionSearchBar } from "@/components/CommissionSearchBar";

// ============================================================
// NOTE: ステータス定義・画像タイプ・日付/金額フォーマッタ・Field/DateField/
// StatusBadge・検索条件のロジックとUIは CommissionApp.tsx と共通のため、
// components/CommissionShared.tsx・hooks/useCommissionSearch.ts・
// components/CommissionSearchBar.tsx からimportしている。
// 以前はこれらがCommissionApp.tsxとDemoApp.tsxにそれぞれ別々に実装されており、
// 片方だけ機能追加（検索UX改善など）するともう片方に反映されず、
// ビルドエラーや表示のズレの原因になっていた。今後、検索条件や
// 上記の共通部品を変更する場合は、この2ファイルではなく共有元を編集すること。
//
// 一方で、画像アップロード・プラン制限まわりはCommissionAppがSupabase Storage・
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

interface DemoCommission {
  id: string;
  title: string;
  artist: string;
  x_id?: string;
  ordered_at?: string;
  deadline?: string;
  rough_date?: string;
  price?: number;
  status: CommissionStatus;
  notes?: string;
  images: DemoImage[];
}

type FormValues = {
  title: string; artist: string; x_id: string;
  ordered_at: string; deadline: string; rough_date: string;
  price: string; status: CommissionStatus; notes: string;
};

const EMPTY_FORM: FormValues = {
  title: "", artist: "", x_id: "", ordered_at: "", deadline: "",
  rough_date: "", price: "", status: "pending", notes: "",
};

const DEMO_MAX_IMAGES = 3;

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function DemoImageSection({ commission, onChange }: {
  commission: DemoCommission;
  onChange: (images: DemoImage[]) => void;
}) {
  const [imageType, setImageType] = useState<ImageType>("rough");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const images = commission.images;
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
    <div style={{ marginTop: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#555", marginBottom: 10 }}>📷 添付画像（デモ: 最大{DEMO_MAX_IMAGES}枚）</div>
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 8, marginBottom: 12 }}>
          {images.map(img => {
            const typeLabel = IMAGE_TYPES.find(t => t.key === img.imageType)?.label ?? img.imageType;
            return (
              <div key={img.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1.5px solid #e5e7eb", background: "#f3f4f6" }}>
                <img src={img.objectUrl} alt={img.fileName} onClick={() => { setPreview(img.objectUrl); setPreviewFileName(img.fileName); }}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", cursor: "pointer" }} />
                <div style={{ position: "absolute", top: 4, left: 4, background: "#1a0a2ecc", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>{typeLabel}</div>
                <button onClick={() => handleDelete(img.id)}
                  style={{ position: "absolute", top: 4, right: 4, background: "#ef4444cc", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                <button onClick={e => { e.stopPropagation(); handleDownload(img.objectUrl, img.fileName); }}
                  title="ダウンロード"
                  style={{ position: "absolute", bottom: 4, right: 4, background: "#1a0a2ecc", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↓</button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={imageType} onChange={e => setImageType(e.target.value as ImageType)}
          style={{ ...inp, width: "auto", padding: "6px 10px" }}>
          {IMAGE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <label style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px 14px", border: `1.5px dashed ${atLimit ? "#fca5a5" : "#c4b5fd"}`,
          borderRadius: 10, cursor: atLimit ? "not-allowed" : "pointer", fontSize: 13,
          color: atLimit ? "#ef4444" : "#7c3aed", fontWeight: 600, background: atLimit ? "#f3f4f6" : "#fff"
        }}>
          {atLimit ? `上限に達しました（${DEMO_MAX_IMAGES}枚）` : "＋ 画像を追加"}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={atLimit} style={{ display: "none" }} />
        </label>
      </div>
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={preview} alt="preview" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, boxShadow: "0 8px 48px #000a" }} />
          <button
            onClick={e => { e.stopPropagation(); handleDownload(preview, previewFileName); }}
            title="ダウンロード"
            style={{
              position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)",
              background: "#fff", color: "#1a0a2e", border: "none", borderRadius: 10,
              padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              boxShadow: "0 2px 16px #000a", display: "flex", alignItems: "center", gap: 6, zIndex: 501
            }}>
            ⬇ ダウンロード
          </button>
        </div>
      )}
    </div>
  );
}

export default function DemoApp({ onExit }: { onExit: () => void }) {
  const [commissions, setCommissions] = useState<DemoCommission[]>([]);
  // 検索・フィルタ・並び替え（CommissionAppと共通のロジック。
  // 詳細は hooks/useCommissionSearch.ts を参照）
  const search = useCommissionSearch(commissions);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingImages, setPendingImages] = useState<DemoImage[]>([]);
  const [pendingImageType, setPendingImageType] = useState<ImageType>("rough");

  // お知らせ・リリースノート（デモは未ログインのため、userId/accountCreatedAtは
  // どちらもnullで呼び出す。announcements/releasesの内容は閲覧できるが、
  // 未読カウント・既読化はuseNotifications側の設計により常に無効化される）
  const notifications = useNotifications(null, null);

  const filtered = search.filtered;

  const stats = {
    total: commissions.length,
    active: commissions.filter(c => c.status !== "done" && c.status !== "cancelled").length,
    done: commissions.filter(c => c.status === "done").length,
  };

  const detailItem = detailId ? commissions.find(c => c.id === detailId) ?? null : null;

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setPendingImages([]); setPendingImageType("rough"); setShowForm(true); }
  function openEdit(c: DemoCommission) {
    setForm({
      title: c.title, artist: c.artist, x_id: c.x_id ?? "", ordered_at: c.ordered_at ?? "",
      deadline: c.deadline ?? "", rough_date: c.rough_date ?? "",
      price: c.price?.toString() ?? "", status: c.status, notes: c.notes ?? ""
    });
    setEditId(c.id); setShowForm(true); setDetailId(null);
  }

  function handleSave() {
    if (!form.title || !form.artist) return;
    const payload: DemoCommission = {
      id: editId ?? uid(),
      title: form.title, artist: form.artist, x_id: form.x_id || undefined,
      ordered_at: form.ordered_at || undefined, deadline: form.deadline || undefined,
      rough_date: form.rough_date || undefined,
      price: form.price ? Number(form.price) : undefined,
      status: form.status, notes: form.notes || undefined,
      images: editId ? (commissions.find(c => c.id === editId)?.images ?? []) : pendingImages,
    };
    if (editId) {
      setCommissions(prev => prev.map(c => c.id === editId ? payload : c));
    } else {
      setCommissions(prev => [payload, ...prev]);
    }
    setPendingImages([]);
    setShowForm(false); setEditId(null);
  }

  function handleDelete(id: string) {
    const c = commissions.find(c => c.id === id);
    c?.images.forEach(img => URL.revokeObjectURL(img.objectUrl));
    setCommissions(prev => prev.filter(c => c.id !== id));
    setDeleteConfirm(null); setDetailId(null);
  }

  function handleImagesChange(commissionId: string, images: DemoImage[]) {
    setCommissions(prev => prev.map(c => c.id === commissionId ? { ...c, images } : c));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5" }} onClick={() => setShowUserMenu(false)}>

      {/* デモバナー */}
      <div style={{
        background: "linear-gradient(90deg,#7c3aed,#4f46e5)", color: "#fff",
        textAlign: "center", padding: "10px 16px", fontSize: 13, fontWeight: 600
      }}>
        🎮 デモモード中 — データはリロードで消えます。
        <button onClick={onExit}
          style={{
            marginLeft: 16, background: "#fff", color: "#7c3aed", border: "none",
            borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer"
          }}>
          登録してはじめる →
        </button>
      </div>

      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)",
        padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 32px #0004", flexWrap: "wrap", gap: 12
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24, filter: "drop-shadow(0 0 8px #a78bfa)" }}>🎨</span>
            <span style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "0.04em" }}>Commission Tracker</span>
          </div>
          <div style={{ color: "#c4b5fd", fontSize: 11, marginTop: 3 }}>絵の依頼管理ツール</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {[["合計", stats.total], ["進行中", stats.active], ["完成", stats.done]].map(([l, v]) => (
            <div key={l as string} style={{ textAlign: "center" }}>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>{v}</div>
              <div style={{ color: "#a78bfa", fontSize: 10 }}>{l}</div>
            </div>
          ))}
          <button
            onClick={() => setShowContact(true)}
            style={{
              width: 38, height: 38, borderRadius: "50%", background: "#ffffff18",
              border: "1px solid #ffffff30", cursor: "pointer", color: "#fff",
              fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title="お問い合わせ"
          >
            ✉️
          </button>
          <button
            onClick={() => setShowNotifications(true)}
            style={{
              width: 38, height: 38, borderRadius: "50%", background: "#ffffff18",
              border: "1px solid #ffffff30", cursor: "pointer", color: "#fff",
              fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title="お知らせ"
          >
            🔔
          </button>
          <button onClick={openNew} style={{
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            color: "#fff", border: "none", borderRadius: 12, padding: "9px 18px", fontWeight: 700,
            fontSize: 13, cursor: "pointer", boxShadow: "0 2px 16px #7c3aed60"
          }}>
            ＋ 新規登録
          </button>
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUserMenu(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 8, background: "#ffffff18",
                border: "1px solid #ffffff30", borderRadius: 99, padding: "6px 12px 6px 6px",
                cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800
              }}>D</div>
              <span>デモユーザー</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
            </button>
            {showUserMenu && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff",
                borderRadius: 12, boxShadow: "0 8px 32px #0003", minWidth: 220, overflow: "hidden", zIndex: 99
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4, whiteSpace: "nowrap" }}>デモモード</div>
                  <span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>無料プラン相当</span>
                </div>
                <button onClick={onExit}
                  style={{
                    width: "100%", padding: "11px 16px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: "#7c3aed", fontWeight: 700, textAlign: "left", whiteSpace: "nowrap"
                  }}>
                  🚀 アカウント登録する
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* フィルタ＋ソート＋詳細検索パネル（CommissionAppと共通コンポーネント） */}
      <CommissionSearchBar search={search} />

      {/* リスト */}
      <main style={{ padding: "20px 32px 60px", maxWidth: 900 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
            <div style={{ color: "#aaa", fontSize: 15, marginBottom: 8 }}>依頼がありません</div>
            <div style={{ color: "#bbb", fontSize: 13 }}>「＋ 新規登録」から依頼を追加してみてください</div>
          </div>
        )}
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(c => (
            <CommissionListCard
              key={c.id}
              title={c.title}
              artist={c.artist}
              xId={c.x_id}
              status={c.status}
              deadline={c.deadline}
              price={c.price}
              imageCount={c.images.length}
              thumbnailUrl={c.images[0]?.objectUrl}
              onClick={() => setDetailId(c.id)}
            />
          ))}
        </div>
      </main>

      {/* 詳細モーダル */}
      {detailItem && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overscrollBehavior: "contain", touchAction: "none" }}
          onClick={() => setDetailId(null)}>
          <div style={{
            background: "#fff", borderRadius: 20, maxWidth: 520, width: "100%",
            height: "calc(100vh - 32px)", maxHeight: 600, display: "flex", flexDirection: "column", boxShadow: "0 8px 48px #0003"
          }}
            onClick={e => e.stopPropagation()}>
            {/* タイトル（固定） */}
            <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: "#1a0a2e", marginBottom: 6 }}>{detailItem.title}</div>
                  <StatusBadge status={detailItem.status} />
                </div>
                <button onClick={() => setDetailId(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa" }}>×</button>
              </div>
            </div>
            {/* コンテンツ（スクロール） */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {[
                    ["絵師名", detailItem.artist],
                    ["X (旧Twitter)", detailItem.x_id || "—"],
                    ["依頼日", fmtDate(detailItem.ordered_at)],
                    ["納期", fmtDate(detailItem.deadline)],
                    ["ラフ提出日", fmtDate(detailItem.rough_date)],
                    ["金額", fmtPrice(detailItem.price)],
                    ["メモ", detailItem.notes || "—"],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td style={{ padding: "8px 0", color: "#888", fontWeight: 600, width: 120, verticalAlign: "top" }}>{label}</td>
                      <td style={{ padding: "8px 0", color: "#222", wordBreak: "break-all" }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DemoImageSection
                commission={detailItem}
                onChange={images => handleImagesChange(detailItem.id, images)}
              />
            </div>
            {/* ボタン（固定） */}
            <div style={{ padding: "0 24px 16px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => openEdit(detailItem)}
                  style={{
                    flex: 1, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
                    border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, cursor: "pointer"
                  }}>編集</button>
                <button onClick={() => setDeleteConfirm(detailItem.id)}
                  style={{
                    flex: 1, background: "#fff", color: "#ef4444", border: "1.5px solid #fca5a5",
                    borderRadius: 10, padding: "10px", fontWeight: 700, cursor: "pointer"
                  }}>削除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 340, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>本当に削除しますか？</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>この操作は元に戻せません。</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 10, padding: "10px", fontWeight: 600, cursor: "pointer" }}>キャンセル</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, cursor: "pointer" }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* フォームモーダル */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overscrollBehavior: "contain", touchAction: "none" }}
          onClick={() => { pendingImages.forEach(pi => URL.revokeObjectURL(pi.objectUrl)); setPendingImages([]); setShowForm(false); setEditId(null); }}>
          <div style={{
            background: "#fff", borderRadius: 20, maxWidth: 520, width: "100%",
            height: "calc(100vh - 32px)", maxHeight: 600, display: "flex", flexDirection: "column", boxShadow: "0 8px 48px #0004"
          }}
            onClick={e => e.stopPropagation()}>
            {/* タイトル（固定） */}
            <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#1a0a2e", marginBottom: 12 }}>
                {editId ? "依頼を編集" : "新規依頼を登録"}
              </div>
            </div>
            {/* フォーム（スクロール） */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
              <div style={{ display: "grid", gap: 16, paddingBottom: 8 }}>
                <Field label="件名 *"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例: アイコン用イラスト" style={inp} /></Field>
                <Field label="絵師名 *"><input value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} placeholder="例: 花咲りん" style={inp} /></Field>
                <Field label="X ID（任意）"><input value={form.x_id} onChange={e => setForm({ ...form, x_id: e.target.value })} placeholder="例: @artist_name" style={inp} /></Field>
                <DateField label="依頼日" value={form.ordered_at} onChange={v => setForm({ ...form, ordered_at: v })} />
                <DateField label="納期" value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} />
                <DateField label="ラフ提出日（任意）" value={form.rough_date} onChange={v => setForm({ ...form, rough_date: v })} />
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
                    style={inp}
                  />
                </Field>
                <Field label="ステータス">
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CommissionStatus })} style={inp}>
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="メモ（任意）">
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="色味の指定や注意点など" style={{ ...inp, minHeight: 70, resize: "vertical" }} />
                </Field>

                {/* 新規登録時のみ画像追加UI */}
                {!editId && (
                  <Field label="画像（任意・登録後にも追加できます）">
                    {pendingImages.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8, marginBottom: 10 }}>
                        {pendingImages.map(pi => (
                          <div key={pi.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1.5px solid #c4b5fd", background: "#f3f4f6" }}>
                            <img src={pi.objectUrl} alt={pi.fileName} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                            <div style={{ position: "absolute", top: 3, left: 3, background: "#1a0a2ecc", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 5 }}>
                              {IMAGE_TYPES.find(t => t.key === pi.imageType)?.label}
                            </div>
                            <button type="button"
                              onClick={() => {
                                URL.revokeObjectURL(pi.objectUrl);
                                setPendingImages(prev => prev.filter(x => x.id !== pi.id));
                              }}
                              style={{ position: "absolute", top: 3, right: 3, background: "#ef4444cc", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select value={pendingImageType} onChange={e => setPendingImageType(e.target.value as ImageType)}
                        style={{ ...inp, width: "auto", padding: "6px 10px" }}>
                        {IMAGE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                      <label style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "8px 14px", border: `1.5px dashed ${pendingImages.length >= DEMO_MAX_IMAGES ? "#fca5a5" : "#c4b5fd"}`,
                        borderRadius: 10, cursor: pendingImages.length >= DEMO_MAX_IMAGES ? "not-allowed" : "pointer",
                        fontSize: 13, color: pendingImages.length >= DEMO_MAX_IMAGES ? "#ef4444" : "#7c3aed",
                        fontWeight: 600, background: pendingImages.length >= DEMO_MAX_IMAGES ? "#f3f4f6" : "#fff"
                      }}>
                        {pendingImages.length >= DEMO_MAX_IMAGES ? `上限（${DEMO_MAX_IMAGES}枚）` : "＋ 画像を追加"}
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
                      <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>※ 登録ボタンを押すと画像も一緒に保存されます</div>
                    )}
                  </Field>
                )}
              </div>
            </div>
            {/* ボタン（固定） */}
            <div style={{ padding: "0 24px 16px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => {
                  pendingImages.forEach(pi => URL.revokeObjectURL(pi.objectUrl));
                  setPendingImages([]);
                  setShowForm(false); setEditId(null);
                }}
                  style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, cursor: "pointer" }}>キャンセル</button>
                <button onClick={handleSave} disabled={!form.title || !form.artist}
                  style={{
                    flex: 2, background: (!form.title || !form.artist) ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    color: "#fff", border: "none", borderRadius: 10, padding: "12px",
                    fontWeight: 800, cursor: (!form.title || !form.artist) ? "not-allowed" : "pointer", fontSize: 15
                  }}>
                  {editId ? "更新する" : pendingImages.length > 0 ? `登録する（画像${pendingImages.length}枚）` : "登録する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "24px 32px", textAlign: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 16px" }}>
          {[
            { href: "/lp", label: "サービス紹介" },
            { href: "/guide", label: "使い方" },
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシーポリシー" },
            { href: "/tokusho", label: "特定商取引法" },
          ].map(link => (
            <a key={link.href} href={link.href}
              style={{ fontSize: 12, color: "#aaa", textDecoration: "none", padding: "2px 4px" }}>
              {link.label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#ccc", marginTop: 10 }}>© 2026 Commission Tracker</div>
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
