"use client";

import { useState, useMemo } from "react";

// ---- 型定義 ----
type CommissionStatus = "pending" | "rough" | "progress" | "done" | "cancelled";
type ImageType = "rough" | "wip" | "finished" | "other";

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

const STATUSES = [
  { key: "pending"   as CommissionStatus, label: "依頼済み",   color: "#f59e0b", bg: "#fef3c7" },
  { key: "rough"     as CommissionStatus, label: "ラフ確認中", color: "#8b5cf6", bg: "#ede9fe" },
  { key: "progress"  as CommissionStatus, label: "制作中",     color: "#3b82f6", bg: "#dbeafe" },
  { key: "done"      as CommissionStatus, label: "完成",       color: "#10b981", bg: "#d1fae5" },
  { key: "cancelled" as CommissionStatus, label: "キャンセル", color: "#6b7280", bg: "#f3f4f6" },
];

const IMAGE_TYPES: { key: ImageType; label: string }[] = [
  { key: "rough", label: "ラフ" }, { key: "wip", label: "作業中" },
  { key: "finished", label: "完成" }, { key: "other", label: "その他" },
];

const DEMO_MAX_IMAGES = 3;

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function fmtDate(d?: string) { if (!d) return "—"; const [y,m,day] = d.split("-"); return `${y}/${m}/${day}`; }
function fmtPrice(price?: number) { if (!price) return "—"; return `¥${price.toLocaleString()}`; }
function daysUntil(d?: string) {
  if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);
}

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb",
  borderRadius: 10, fontSize: 14, outline: "none", color: "#1a0a2e",
  background: "#faf8f5", boxSizing: "border-box",
};
const inp_date: React.CSSProperties = {
  minWidth: 0, padding: "9px 8px", border: "1.5px solid #e5e7eb",
  borderRadius: 10, fontSize: 14, outline: "none", color: "#1a0a2e",
  background: "#faf8f5", boxSizing: "border-box",
};

function StatusBadge({ status }: { status: CommissionStatus }) {
  const s = STATUSES.find(x => x.key === status) ?? STATUSES[0];
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}40`,
      borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6, letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" value={value} onChange={e => onChange(e.target.value)} style={{ ...inp_date, flex: 1 }} />
        {value && (
          <button type="button" onClick={() => onChange("")}
            style={{ flexShrink: 0, background: "#f3f4f6", border: "1.5px solid #e5e7eb", borderRadius: 8,
              width: 32, height: 36, cursor: "pointer", fontSize: 14, color: "#888",
              display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        )}
      </div>
    </Field>
  );
}

function DemoImageSection({ commission, onChange }: {
  commission: DemoCommission;
  onChange: (images: DemoImage[]) => void;
}) {
  const [imageType, setImageType] = useState<ImageType>("rough");
  const [preview, setPreview] = useState<string | null>(null);
  const images = commission.images;
  const atLimit = images.length >= DEMO_MAX_IMAGES;

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
                <img src={img.objectUrl} alt={img.fileName} onClick={() => setPreview(img.objectUrl)}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", cursor: "pointer" }} />
                <div style={{ position: "absolute", top: 4, left: 4, background: "#1a0a2ecc", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>{typeLabel}</div>
                <button onClick={() => handleDelete(img.id)}
                  style={{ position: "absolute", top: 4, right: 4, background: "#ef4444cc", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
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
        <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px 14px", border: `1.5px dashed ${atLimit ? "#fca5a5" : "#c4b5fd"}`,
          borderRadius: 10, cursor: atLimit ? "not-allowed" : "pointer", fontSize: 13,
          color: atLimit ? "#ef4444" : "#7c3aed", fontWeight: 600, background: atLimit ? "#f3f4f6" : "#fff" }}>
          {atLimit ? `上限に達しました（${DEMO_MAX_IMAGES}枚）` : "＋ 画像を追加"}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={atLimit} style={{ display: "none" }} />
        </label>
      </div>
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={preview} alt="preview" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, boxShadow: "0 8px 48px #000a" }} />
        </div>
      )}
    </div>
  );
}

export default function DemoApp({ onExit }: { onExit: () => void }) {
  const [commissions, setCommissions] = useState<DemoCommission[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | CommissionStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sortKey, setSortKey] = useState<"ordered_at" | "deadline" | "price" | "status">("ordered_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const list = filterStatus === "all" ? commissions : commissions.filter(c => c.status === filterStatus);
    return [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "ordered_at") { av = a.ordered_at ?? ""; bv = b.ordered_at ?? ""; }
      else if (sortKey === "deadline") { av = a.deadline ?? ""; bv = b.deadline ?? ""; }
      else if (sortKey === "price") { av = a.price ?? 0; bv = b.price ?? 0; }
      else if (sortKey === "status") {
        const order = ["pending","rough","progress","done","cancelled"];
        av = order.indexOf(a.status); bv = order.indexOf(b.status);
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [commissions, filterStatus, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: commissions.length,
    active: commissions.filter(c => c.status !== "done" && c.status !== "cancelled").length,
    done: commissions.filter(c => c.status === "done").length,
  }), [commissions]);

  const detailItem = detailId ? commissions.find(c => c.id === detailId) ?? null : null;

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }
  function openEdit(c: DemoCommission) {
    setForm({ title: c.title, artist: c.artist, x_id: c.x_id ?? "", ordered_at: c.ordered_at ?? "",
      deadline: c.deadline ?? "", rough_date: c.rough_date ?? "",
      price: c.price?.toString() ?? "", status: c.status, notes: c.notes ?? "" });
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
      images: editId ? (commissions.find(c => c.id === editId)?.images ?? []) : [],
    };
    if (editId) {
      setCommissions(prev => prev.map(c => c.id === editId ? payload : c));
    } else {
      setCommissions(prev => [payload, ...prev]);
    }
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
      <div style={{ background: "linear-gradient(90deg,#7c3aed,#4f46e5)", color: "#fff",
        textAlign: "center", padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>
        🎮 デモモード中 — データはリロードで消えます。
        <button onClick={onExit}
          style={{ marginLeft: 16, background: "#fff", color: "#7c3aed", border: "none",
            borderRadius: 8, padding: "4px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          登録してはじめる →
        </button>
      </div>

      {/* Header */}
      <header style={{ background: "linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)",
        padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 32px #0004", flexWrap: "wrap", gap: 12 }}>
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
          <button onClick={openNew} style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            color: "#fff", border: "none", borderRadius: 12, padding: "9px 18px", fontWeight: 700,
            fontSize: 13, cursor: "pointer", boxShadow: "0 2px 16px #7c3aed60" }}>
            ＋ 新規登録
          </button>
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUserMenu(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#ffffff18",
                border: "1px solid #ffffff30", borderRadius: 99, padding: "6px 12px 6px 6px",
                cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>D</div>
              <span>デモユーザー</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
            </button>
            {showUserMenu && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff",
                borderRadius: 12, boxShadow: "0 8px 32px #0003", minWidth: 180, overflow: "hidden", zIndex: 99 }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>デモモード</div>
                  <span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>無料プラン相当</span>
                </div>
                <button onClick={onExit}
                  style={{ width: "100%", padding: "11px 16px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: "#7c3aed", fontWeight: 700, textAlign: "left" }}>
                  🚀 アカウント登録する
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* フィルタ＋ソート */}
      <div style={{ padding: "16px 32px 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {[{ key: "all", label: "すべて" } as const, ...STATUSES].map(s => (
          <button key={s.key} onClick={() => setFilterStatus(s.key as any)}
            style={{ background: filterStatus === s.key ? ("color" in s ? s.color : "#1a0a2e") : "#fff",
              color: filterStatus === s.key ? "#fff" : "#555",
              border: `1.5px solid ${filterStatus === s.key ? ("color" in s ? s.color : "#1a0a2e") : "#e5e7eb"}`,
              borderRadius: 999, padding: "5px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {s.label}
          </button>
        ))}
        {/* 並び替え */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as any)}
            style={{ padding: "5px 10px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 12, outline: "none", background: "#fff", color: "#555", cursor: "pointer" }}>
            <option value="ordered_at">依頼日順</option>
            <option value="deadline">納期順</option>
            <option value="price">金額順</option>
            <option value="status">ステータス順</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            style={{ padding: "5px 10px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 12, background: "#fff", color: "#555", cursor: "pointer", fontWeight: 700 }}>
            {sortDir === "asc" ? "↑ 昇順" : "↓ 降順"}
          </button>
        </div>
      </div>

      {/* リスト */}
      <main style={{ padding: "20px 32px 60px", maxWidth: 900 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
            <div style={{ color: "#aaa", fontSize: 15, marginBottom: 8 }}>依頼がありません</div>
            <div style={{ color: "#bbb", fontSize: 13 }}>「＋ 新規登録」から依頼を追加してみてください</div>
          </div>
        )}
        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map(c => {
            const days = daysUntil(c.deadline);
            const urgent = days !== null && days <= 7 && c.status !== "done" && c.status !== "cancelled";
            return (
              <div key={c.id} onClick={() => setDetailId(c.id)}
                style={{ background: "#fff", borderRadius: 16, padding: "18px 22px",
                  boxShadow: urgent ? "0 0 0 2px #ef444460,0 2px 12px #0001" : "0 1px 6px #0001,0 2px 12px #0001",
                  border: urgent ? "1.5px solid #fca5a5" : "1.5px solid transparent",
                  cursor: "pointer", display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 16px", alignItems: "center",
                  transition: "transform 0.1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "#1a0a2e" }}>{c.title}</span>
                    <StatusBadge status={c.status} />
                    {urgent && <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>⚠ あと{days}日</span>}
                    {c.images.length > 0 && <span style={{ fontSize: 11, color: "#7c3aed" }}>📷 {c.images.length}枚</span>}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#555" }}>
                    <span>🖌 {c.artist}{c.x_id && <span style={{ color: "#7c3aed", marginLeft: 4 }}>{c.x_id}</span>}</span>
                    <span>📅 {fmtDate(c.ordered_at)}</span>
                    <span>⏰ 納期: {fmtDate(c.deadline)}</span>
                    {c.rough_date && <span>✏️ ラフ: {fmtDate(c.rough_date)}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#1a0a2e" }}>{fmtPrice(c.price)}</div>
                  {days !== null && c.status !== "done" && c.status !== "cancelled" && (
                    <div style={{ fontSize: 11, color: days < 0 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#aaa", marginTop: 2 }}>
                      {days < 0 ? `${Math.abs(days)}日超過` : days === 0 ? "今日が納期" : `残${days}日`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 詳細モーダル */}
      {detailItem && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setDetailId(null)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 36px", maxWidth: 520, width: "92%",
            maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 48px #0003" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: "#1a0a2e", marginBottom: 6 }}>{detailItem.title}</div>
                <StatusBadge status={detailItem.status} />
              </div>
              <button onClick={() => setDetailId(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa" }}>×</button>
            </div>
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
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => openEdit(detailItem)}
                style={{ flex: 1, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, cursor: "pointer" }}>編集</button>
              <button onClick={() => setDeleteConfirm(detailItem.id)}
                style={{ flex: 1, background: "#fff", color: "#ef4444", border: "1.5px solid #fca5a5",
                  borderRadius: 10, padding: "10px", fontWeight: 700, cursor: "pointer" }}>削除</button>
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
        <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 36px", maxWidth: 520, width: "92%",
            maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 48px #0004" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#1a0a2e", marginBottom: 24 }}>
              {editId ? "依頼を編集" : "新規依頼を登録"}
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <Field label="件名 *"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例: アイコン用イラスト" style={inp} /></Field>
              <Field label="絵師名 *"><input value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} placeholder="例: 花咲りん" style={inp} /></Field>
              <Field label="X ID（任意）"><input value={form.x_id} onChange={e => setForm({ ...form, x_id: e.target.value })} placeholder="例: @artist_name" style={inp} /></Field>
              <DateField label="依頼日" value={form.ordered_at} onChange={v => setForm({ ...form, ordered_at: v })} />
              <DateField label="納期" value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} />
              <DateField label="ラフ提出日（任意）" value={form.rough_date} onChange={v => setForm({ ...form, rough_date: v })} />
              <Field label="金額（円）"><input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="例: 5000" style={inp} /></Field>
              <Field label="ステータス">
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CommissionStatus })} style={inp}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="メモ（任意）">
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="色味の指定や注意点など" style={{ ...inp, minHeight: 70, resize: "vertical" }} />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, cursor: "pointer" }}>キャンセル</button>
              <button onClick={handleSave} disabled={!form.title || !form.artist}
                style={{ flex: 2, background: (!form.title || !form.artist) ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  color: "#fff", border: "none", borderRadius: 10, padding: "12px",
                  fontWeight: 800, cursor: (!form.title || !form.artist) ? "not-allowed" : "pointer", fontSize: 15 }}>
                {editId ? "更新する" : "登録する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フッター */}
      <footer style={{ borderTop:"1px solid #e5e7eb", padding:"24px 32px", textAlign:"center" }}>
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"4px 16px" }}>
          {[
            { href:"/guide", label:"使い方" },
            { href:"/terms", label:"利用規約" },
            { href:"/privacy", label:"プライバシーポリシー" },
            { href:"/tokusho", label:"特定商取引法" },
            { href:"/version", label:"バージョン情報" },
          ].map(link => (
            <a key={link.href} href={link.href}
              style={{ fontSize:12, color:"#aaa", textDecoration:"none", padding:"2px 4px" }}>
              {link.label}
            </a>
          ))}
        </div>
        <div style={{ fontSize:11, color:"#ccc", marginTop:10 }}>© 2026 Commission Tracker</div>
      </footer>
    </div>
  );
}
