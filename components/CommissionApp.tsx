"use client";

import { useState, useEffect, useMemo } from "react";
import {
  supabase, requestDeleteAccount, fetchCommissions, createCommission, updateCommission,
  deleteCommission, uploadImage, deleteImage, getSignedImageUrl,
  fetchMyProfile, canUploadImage,
  PLAN_LIMITS,
  type Commission, type CommissionStatus, type CommissionImage,
  type ImageType, type UserProfile, type Plan,
  fetchCommissionById,
} from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// ---- 定数とユーティリティ ----
const STATUSES: { key: CommissionStatus; label: string; color: string; bg: string }[] = [
  { key: "pending",   label: "依頼済み",   color: "#f59e0b", bg: "#fef3c7" },
  { key: "rough",     label: "ラフ確認中", color: "#8b5cf6", bg: "#ede9fe" },
  { key: "progress",  label: "制作中",     color: "#3b82f6", bg: "#dbeafe" },
  { key: "done",      label: "完成",       color: "#10b981", bg: "#d1fae5" },
  { key: "cancelled", label: "キャンセル", color: "#6b7280", bg: "#f3f4f6" },
];

// --- 画像タイプのラベル ---
const IMAGE_TYPES: { key: ImageType; label: string }[] = [
  { key: "rough", label: "ラフ" }, { key: "wip", label: "作業中" },
  { key: "finished", label: "完成" }, { key: "other", label: "その他" },
];

// --- 画像アップロード前のプラン制限チェック ---
type FormValues = {
  title: string; artist: string; x_id: string; ordered_at: string;
  deadline: string; price: string; currency: string;
  status: CommissionStatus; rough_date: string; notes: string;
};

// 画像アップロード前にプランの上限をチェック
const EMPTY_FORM: FormValues = {
  title: "", artist: "", x_id: "", ordered_at: "", deadline: "",
  price: "", currency: "JPY", status: "pending", rough_date: "", notes: "",
};

// --- 画像アップロード前にプランの上限をチェック ---
function fmtDate(d?: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${y}/${m}/${day}`;
}

// --- 金額をフォーマット ---
function fmtPrice(price?: number, currency?: string) {
  if (!price) return "—";
  return `${price.toLocaleString()} 円`;
}

// --- 締切までの日数を計算 ---
function daysUntil(d?: string) {
  if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);
}

// --- 締切までの日数スタイル ---
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb",
  borderRadius: 10, fontSize: 14, outline: "none", color: "#1a0a2e",
  background: "#faf8f5", boxSizing: "border-box",
};

// --- 日付の入力フィールドスタイル ---
const inp_date: React.CSSProperties = {
  minWidth: 0, padding: "9px 8px", border: "1.5px solid #e5e7eb",
  borderRadius: 10, fontSize: 14, outline: "none", color: "#1a0a2e",
  background: "#faf8f5", boxSizing: "border-box",
};

// --- 日付入力フィールド ---
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        <input type="date" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...inp_date, flex:1 }} />
        {value && (
          <button type="button" onClick={() => onChange("")}
            style={{ flexShrink:0, background:"#f3f4f6", border:"1.5px solid #e5e7eb", borderRadius:8,
              width:32, height:36, cursor:"pointer", fontSize:14, color:"#888", display:"flex",
              alignItems:"center", justifyContent:"center" }}>
            ×
          </button>
        )}
      </div>
    </Field>
  );
}

// --- 画像アップロード前にプランの上限をチェック ---
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#555", marginBottom:6, letterSpacing:"0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

// --- ステータスバッジ ---
function StatusBadge({ status }: { status: CommissionStatus }) {
  const s = STATUSES.find(x => x.key === status) ?? STATUSES[0];
  return (
    <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.color}40`,
      borderRadius:999, padding:"2px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      {s.label}
    </span>
  );
}

// --- プランバッジ ---
function PlanBadge({ plan }: { plan: Plan }) {
  const p = PLAN_LIMITS[plan];
  return (
    <span style={{ background:p.bg, color:p.color, border:`1px solid ${p.color}40`,
      borderRadius:999, padding:"2px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      {p.label}
    </span>
  );
}

// ---- 画像使用量バー ----
function ImageUsageBar({ plan, imageCount }: { plan: Plan; imageCount: number }) {
  const limit = PLAN_LIMITS[plan].imageLimit;
  if (limit === null) {
    return (
      <div style={{ fontSize:12, color:"#10b981", fontWeight:600 }}>
        📷 {imageCount}枚（無制限）
      </div>
    );
  }
  const pct = Math.min((imageCount / limit) * 100, 100);
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#7c3aed";
  return (
    <div style={{ minWidth:160 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#aaa", marginBottom:3 }}>
        <span>📷 画像 {imageCount} / {limit}枚</span>
        <span style={{ color, fontWeight:700 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height:5, background:"#e5e7eb", borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width 0.4s" }} />
      </div>
    </div>
  );
}

// ---- 画像セクション ----
function ImageSection({ commission, plan, onUpdated }: {
  commission: Commission; plan: Plan; onUpdated: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prevCount, setPrevCount] = useState<number>(commission.images?.length ?? 0);
  useEffect(() => {
    // commission.idが変わったらprevCountをリセット
    setPrevCount(commission.images?.length ?? 0);
  }, [commission.id]);
  useEffect(() => {
    const currentCount = commission.images?.length ?? 0;
    if (prevCount !== currentCount) {
      if (currentCount > prevCount) {
        setToast(`画像をアップロードしました（最新枚数: ${currentCount}枚）`);
      } else if (currentCount < prevCount) {
        setToast(`画像を削除しました（最新枚数: ${currentCount}枚）`);
      }
      setTimeout(() => setToast(null), 3000);
      setPrevCount(currentCount);
    }
  }, [commission.images?.length]);
  const [imageType, setImageType] = useState<ImageType>("rough");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  useEffect(() => {
    const images = commission.images ?? [];
    if (!images.length) return;
    Promise.all(images.map(async img => {
      const url = await getSignedImageUrl(img.storage_path).catch(() => "");
      return [img.id, url] as [string, string];
    })).then(entries => setSignedUrls(Object.fromEntries(entries)));
  }, [commission.images]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLimitError(null);
    setUploading(true);
    try {
      await uploadImage(commission.id, file, imageType, plan);
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
      onUpdated(); // アップロード後に必ず再取得
      // 再取得後のcommission.images.lengthを即時トースト
      setTimeout(() => {
        setToast(`画像をアップロードしました（最新枚数: ${(commission.images?.length ?? 0) + 1}枚）`);
        setTimeout(() => setToast(null), 3000);
      }, 500);
    }
  }

  async function handleDelete(img: CommissionImage) {
    if (!confirm(`「${img.file_name}」を削除しますか？`)) return;
    await deleteImage(img);
    onUpdated();
    setTimeout(() => {
      setToast(`画像を削除しました（最新枚数: ${(commission.images?.length ?? 0) - 1}枚）`);
      setTimeout(() => setToast(null), 3000);
    }, 500);
    // ...existing code...
    {toast && (
      <div style={{ position:"fixed", bottom:30, left:"50%", transform:"translateX(-50%)", background:"#7c3aed", color:"#fff", padding:"12px 24px", borderRadius:12, fontSize:14, fontWeight:700, boxShadow:"0 4px 16px #0003", zIndex:999 }}>
        {toast}
      </div>
    )}
  }

  const images = commission.images ?? [];
  const limit = PLAN_LIMITS[plan].imageLimit;
  const atLimit = limit !== null && images.length >= limit;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontWeight:700, fontSize:13, color:"#555", marginBottom:10 }}>📷 添付画像</div>

      {limitError && (
        <div style={{ marginBottom:10, padding:"8px 12px", background:"#fee2e2", border:"1px solid #fca5a5",
          borderRadius:10, fontSize:12, color:"#b91c1c" }}>
          ⚠ {limitError}
          <span style={{ marginLeft:6, color:"#7c3aed", fontWeight:700 }}>プランをアップグレードすると追加できます</span>
        </div>
      )}

      {images.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:8, marginBottom:12 }}>
          {images.map(img => {
            const url = signedUrls[img.id];
            const typeLabel = IMAGE_TYPES.find(t => t.key === img.image_type)?.label ?? img.image_type;
            return (
              <div key={img.id} style={{ position:"relative", borderRadius:10, overflow:"hidden",
                border:"1.5px solid #e5e7eb", background:"#f3f4f6" }}>
                {url ? (
                  <img src={url} alt={img.file_name} onClick={() => setPreview(url)}
                    style={{ width:"100%", aspectRatio:"1", objectFit:"cover", cursor:"pointer" }} />
                ) : (
                  <div style={{ width:"100%", aspectRatio:"1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🖼</div>
                )}
                <div style={{ position:"absolute", top:4, left:4, background:"#1a0a2ecc", color:"#fff",
                  fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:6 }}>{typeLabel}</div>
                <button onClick={() => handleDelete(img)}
                  style={{ position:"absolute", top:4, right:4, background:"#ef4444cc", color:"#fff",
                    border:"none", borderRadius:"50%", width:20, height:20, fontSize:12, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <select value={imageType} onChange={e => setImageType(e.target.value as ImageType)}
          style={{ ...inp, width:"auto", padding:"6px 10px" }}>
          {IMAGE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <label style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          padding:"8px 14px", border:`1.5px dashed ${atLimit ? "#fca5a5" : "#c4b5fd"}`,
          borderRadius:10, cursor: atLimit ? "not-allowed" : "pointer", fontSize:13,
          color: atLimit ? "#ef4444" : "#7c3aed", fontWeight:600,
          background: (uploading || atLimit) ? "#f3f4f6" : "#fff" }}>
          {uploading ? "アップロード中…" : atLimit ? `上限に達しました（${limit}枚）` : "＋ 画像を追加"}
          <input type="file" accept="image/*" onChange={handleUpload}
            disabled={uploading || atLimit} style={{ display:"none" }} />
        </label>
      </div>

      {preview && (
        <div onClick={() => setPreview(null)} style={{ position:"fixed", inset:0, background:"#000a",
          zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out" }}>
          <img src={preview} alt="preview"
            style={{ maxWidth:"90vw", maxHeight:"90vh", borderRadius:12, boxShadow:"0 8px 48px #000a" }} />
        </div>
      )}
    </div>
  );
}

// ---- メインアプリ ----
export default function CommissionApp() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [imageCount, setImageCount] = useState(0);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | CommissionStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Commission | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteRequesting, setDeleteRequesting] = useState(false);
  const [deleteRequestDone, setDeleteRequestDone] = useState(false);

  useEffect(() => {
    // 初回: セッション確認してuserをセット、なければloginへ
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login";
      } else {
        setUser(session.user);
      }
    });
    // セッション変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        window.location.href = "/login";
      } else {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // データのロード
  async function load() {
    try {
      const [data, prof] = await Promise.all([fetchCommissions(), fetchMyProfile()]);
      setCommissions(data);
      setProfile(prof);
      // 合計画像枚数カウント
      const total = data.reduce((sum, c) => sum + (c.images?.length ?? 0), 0);
      setImageCount(total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (user) load(); }, [user]);

  // --- プロフィールの更新 ---
  async function handleSaveName() {
    if (!nameInput.trim()) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    await supabase.from("user_profiles").update({ display_name: nameInput.trim() }).eq("id", u.id);
    await load();
    setShowNameEdit(false);
    setShowUserMenu(false);
  }

  // --- アカウント削除リクエスト ---
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

  // ログアウト処理
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // フィルタリングされたリスト
  const filtered = useMemo(() =>
    filterStatus === "all" ? commissions : commissions.filter(c => c.status === filterStatus),
    [commissions, filterStatus]
  );

  // ステータスごとの統計
  const stats = useMemo(() => ({
    total: commissions.length,
    active: commissions.filter(c => c.status !== "done" && c.status !== "cancelled").length,
    done: commissions.filter(c => c.status === "done").length,
  }), [commissions]);

  // プロフィールの取得
  function openNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }
  function openEdit(c: Commission) {
    setForm({ title:c.title, artist:c.artist, x_id:c.x_id??"", ordered_at:c.ordered_at??"",
      deadline:c.deadline??"", price:c.price?.toString()??"", currency:c.currency,
      status:c.status, rough_date:c.rough_date??"", notes:c.notes??"" });
    setEditId(c.id); setShowForm(true); setDetailId(null);
  }

  //  保存処理
  async function handleSave() {
    if (!form.title || !form.artist) return;
    setSaving(true);
    try {
      const payload = {
        title:form.title, artist:form.artist, x_id:form.x_id||undefined,
        ordered_at:form.ordered_at||undefined, deadline:form.deadline||undefined,
        price:form.price?Number(form.price):undefined, currency:form.currency,
        status:form.status, rough_date:form.rough_date||undefined, notes:form.notes||undefined,
      };
      if (editId) {
        await updateCommission(editId, payload);
      } else {
        await createCommission(payload);
      }
      await load();
      if (detailId) {
        fetchCommissionById(detailId).then(setDetailItem).catch(() => setDetailItem(null));
      }
      setShowForm(false); setEditId(null);
    } catch { alert("保存に失敗しました"); }
    finally { setSaving(false); }
  }

  // 削除処理
  async function handleDelete(id: string) {
    try {
      await deleteCommission(id);
      await load();
      if (detailId) {
        fetchCommissionById(detailId).then(setDetailItem).catch(() => setDetailItem(null));
      }
    }
    catch { alert("削除に失敗しました"); }
    setDeleteConfirm(null); setDetailId(null);
  }

  // 詳細表示のための最新データ抽出
  useEffect(() => {
    if (!detailId) {
      setDetailItem(null);
      return;
    }
    // 一覧取得後の最新commissionから詳細を抽出
    const item = commissions.find(c => c.id === detailId) ?? null;
    setDetailItem(item);
  }, [detailId, commissions]);
  const plan = (profile?.plan ?? "free") as Plan;
  const displayName = profile?.display_name;
  const userLabel = displayName ?? user?.user_metadata?.full_name ?? (user?.email?.split("@")[0]) ?? "ユーザー";
  const userAvatar = user?.user_metadata?.avatar_url as string | undefined;

  // ローディング中の表示
  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#faf8f5", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#7c3aed", fontSize:16, fontWeight:700 }}>読み込み中…</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#faf8f5" }} onClick={() => setShowUserMenu(false)}>

      {/* Header */}
      <header style={{ background:"linear-gradient(135deg,#1a0a2e 0%,#2d1a4a 60%,#1a2a4a 100%)",
        padding:"20px 32px", display:"flex", alignItems:"center", justifyContent:"space-between",
        boxShadow:"0 4px 32px #0004", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:24, filter:"drop-shadow(0 0 8px #a78bfa)" }}>🎨</span>
            <span style={{ color:"#fff", fontSize:20, fontWeight:800, letterSpacing:"0.04em" }}>Commission Tracker</span>
          </div>
          <div style={{ color:"#c4b5fd", fontSize:11, marginTop:3 }}>絵の依頼管理ツール</div>
        </div>

        <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
          {/* 統計 */}
          {[["合計",stats.total],["進行中",stats.active],["完成",stats.done]].map(([l,v]) => (
            <div key={l as string} style={{ textAlign:"center" }}>
              <div style={{ color:"#fff", fontSize:20, fontWeight:800 }}>{v}</div>
              <div style={{ color:"#a78bfa", fontSize:10 }}>{l}</div>
            </div>
          ))}

          {/* 画像使用量 */}
          {profile && (
            <div style={{ background:"#ffffff12", borderRadius:10, padding:"8px 14px" }}>
              <ImageUsageBar plan={plan} imageCount={imageCount} />
            </div>
          )}

          <button onClick={openNew} style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
            color:"#fff", border:"none", borderRadius:12, padding:"9px 18px", fontWeight:700,
            fontSize:13, cursor:"pointer", boxShadow:"0 2px 16px #7c3aed60" }}>
            ＋ 新規登録
          </button>

          {/* ユーザーメニュー */}
          <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUserMenu(v => !v)}
              style={{ display:"flex", alignItems:"center", gap:8, background:"#ffffff18",
                border:"1px solid #ffffff30", borderRadius:99, padding:"6px 12px 6px 6px",
                cursor:"pointer", color:"#fff", fontSize:13, fontWeight:600 }}>
              {userAvatar ? (
                <img src={userAvatar} alt="avatar" style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover" }} />
              ) : (
                <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800 }}>
                  {userLabel.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{userLabel}</span>
              <span style={{ fontSize:10, opacity:0.7 }}>▼</span>
            </button>
            {showUserMenu && (
              <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", background:"#fff",
                borderRadius:12, boxShadow:"0 8px 32px #0003", minWidth:180, overflow:"hidden", zIndex:99 }}>
                <div style={{ padding:"12px 16px", borderBottom:"1px solid #f3f4f6" }}>
                  <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>{user?.email}</div>
                  {profile && <PlanBadge plan={profile.plan} />}
                </div>
                <button onClick={() => { setNameInput(profile?.display_name ?? ""); setShowNameEdit(true); setShowUserMenu(false); }}
                  style={{ width:"100%", padding:"11px 16px", background:"none", border:"none",
                    borderBottom:"1px solid #f3f4f6", cursor:"pointer", fontSize:13,
                    color:"#1a0a2e", fontWeight:600, textAlign:"left" }}>
                  ✏️ 名前を変更
                </button>
                {!profile?.is_admin && (
                  <button onClick={() => window.location.href = "/contact"}
                    style={{ width:"100%", padding:"11px 16px", background:"none", border:"none",
                      borderBottom:"1px solid #f3f4f6", cursor:"pointer", fontSize:13,
                      color:"#1a0a2e", fontWeight:600, textAlign:"left" }}>
                    ✉️ お問い合わせ
                  </button>
                )}
                {profile?.is_admin && (
                  <button onClick={() => window.location.href = "/mgmt-c7f2a91e"}
                    style={{ width:"100%", padding:"11px 16px", background:"none", border:"none",
                      borderBottom:"1px solid #f3f4f6", cursor:"pointer", fontSize:13,
                      color:"#7c3aed", fontWeight:700, textAlign:"left" }}>
                    ⚙ 管理者ページ
                  </button>
                )}
                {!profile?.is_admin && (
                  <button onClick={() => { setShowDeleteRequest(true); setShowUserMenu(false); }}
                    style={{ width:"100%", padding:"11px 16px", background:"none", border:"none",
                      borderTop:"1px solid #f3f4f6", cursor:"pointer", fontSize:13,
                      color:"#ef4444", fontWeight:600, textAlign:"left" }}>
                    🗑 アカウント削除を申請
                  </button>
                )}
                <button onClick={handleLogout}
                  style={{ width:"100%", padding:"11px 16px", background:"none", border:"none",
                    cursor:"pointer", fontSize:13, color:"#ef4444", fontWeight:700, textAlign:"left" }}>
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* フィルタ */}
      <div style={{ padding:"16px 32px 0", display:"flex", gap:8, flexWrap:"wrap" }}>
        {[{ key:"all", label:"すべて" } as const, ...STATUSES].map(s => (
          <button key={s.key} onClick={() => setFilterStatus(s.key as any)}
            style={{ background: filterStatus===s.key ? ("color" in s ? s.color : "#1a0a2e") : "#fff",
              color: filterStatus===s.key ? "#fff" : "#555",
              border:`1.5px solid ${filterStatus===s.key ? ("color" in s ? s.color : "#1a0a2e") : "#e5e7eb"}`,
              borderRadius:999, padding:"5px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* リスト */}
      <main style={{ padding:"20px 32px 60px", maxWidth:900 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", color:"#aaa", marginTop:60, fontSize:15 }}>依頼がありません</div>
        )}
        <div style={{ display:"grid", gap:14 }}>
          {filtered.map(c => {
            const days = daysUntil(c.deadline);
            const urgent = days !== null && days <= 7 && c.status !== "done" && c.status !== "cancelled";
            return (
              <div key={c.id} onClick={() => setDetailId(c.id)}
                style={{ background:"#fff", borderRadius:16, padding:"18px 22px",
                  boxShadow: urgent?"0 0 0 2px #ef444460,0 2px 12px #0001":"0 1px 6px #0001,0 2px 12px #0001",
                  border: urgent?"1.5px solid #fca5a5":"1.5px solid transparent",
                  cursor:"pointer", display:"grid", gridTemplateColumns:"1fr auto", gap:"4px 16px", alignItems:"center",
                  transition:"transform 0.1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(0)"; }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:800, fontSize:16, color:"#1a0a2e" }}>{c.title}</span>
                    <StatusBadge status={c.status} />
                    {urgent && <span style={{ fontSize:11, color:"#ef4444", fontWeight:700 }}>⚠ あと{days}日</span>}
                    {(c.images?.length ?? 0) > 0 && <span style={{ fontSize:11, color:"#7c3aed" }}>📷 {c.images!.length}枚</span>}
                  </div>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:13, color:"#555" }}>
                    <span>🖌 {c.artist}{c.x_id && <span style={{ color:"#7c3aed", marginLeft:4 }}>{c.x_id}</span>}</span>
                    <span>📅 {fmtDate(c.ordered_at)}</span>
                    <span>⏰ 納期: {fmtDate(c.deadline)}</span>
                    {c.rough_date && <span>✏️ ラフ: {fmtDate(c.rough_date)}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:800, fontSize:18, color:"#1a0a2e" }}>{fmtPrice(c.price, c.currency)}</div>
                  {days !== null && c.status !== "done" && c.status !== "cancelled" && (
                    <div style={{ fontSize:11, color:days<0?"#ef4444":days<=7?"#f59e0b":"#aaa", marginTop:2 }}>
                      {days<0?`${Math.abs(days)}日超過`:days===0?"今日が納期":`残${days}日`}
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
        <div style={{ position:"fixed", inset:0, background:"#0006", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setDetailId(null)}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 36px", maxWidth:520, width:"92%",
            maxHeight:"88vh", overflowY:"auto", boxShadow:"0 8px 48px #0003" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:20, color:"#1a0a2e", marginBottom:6 }}>{detailItem.title}</div>
                <StatusBadge status={detailItem.status} />
              </div>
              <button onClick={() => setDetailId(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#aaa" }}>×</button>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
              <tbody>
                {[
                  ["絵師名", detailItem.artist],
                  ["X (旧Twitter)", detailItem.x_id || "—"],
                  ["依頼日", fmtDate(detailItem.ordered_at)],
                  ["納期", fmtDate(detailItem.deadline)],
                  ["ラフ提出日", fmtDate(detailItem.rough_date)],
                  ["金額", fmtPrice(detailItem.price, detailItem.currency)],
                  ["メモ", detailItem.notes || "—"],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding:"8px 0", color:"#888", fontWeight:600, width:120, verticalAlign:"top" }}>{label}</td>
                    <td style={{ padding:"8px 0", color:"#222", wordBreak:"break-all" }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ImageSection commission={detailItem} plan={plan} onUpdated={load} />
            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              <button onClick={() => openEdit(detailItem)}
                style={{ flex:1, background:"linear-gradient(135deg,#7c3aed,#4f46e5)", color:"#fff",
                  border:"none", borderRadius:10, padding:"10px", fontWeight:700, cursor:"pointer" }}>編集</button>
              <button onClick={() => setDeleteConfirm(detailItem.id)}
                style={{ flex:1, background:"#fff", color:"#ef4444", border:"1.5px solid #fca5a5",
                  borderRadius:10, padding:"10px", fontWeight:700, cursor:"pointer" }}>削除</button>
            </div>
          </div>
        </div>
      )}

      {/* アカウント削除申請モーダル */}
      {showDeleteRequest && (
        <div style={{ position:"fixed", inset:0, background:"#0007", zIndex:200,
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => { if (!deleteRequesting) { setShowDeleteRequest(false); setDeleteRequestDone(false); } }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px", maxWidth:380,
            width:"90%", boxShadow:"0 8px 48px #0004", textAlign:"center" }}
            onClick={e => e.stopPropagation()}>
            {deleteRequestDone ? (
              <>
                <div style={{ fontSize:48, marginBottom:12 }}>📨</div>
                <div style={{ fontWeight:800, fontSize:17, color:"#1a0a2e", marginBottom:12 }}>
                  申請を送信しました
                </div>
                <div style={{ fontSize:13, color:"#666", lineHeight:1.7, marginBottom:24 }}>
                  管理者にメールで通知しました。<br />
                  削除が完了するまで少しお待ちください。
                </div>
                <button onClick={() => { setShowDeleteRequest(false); setDeleteRequestDone(false); }}
                  style={{ background:"linear-gradient(135deg,#7c3aed,#4f46e5)", color:"#fff",
                    border:"none", borderRadius:10, padding:"11px 28px",
                    fontWeight:700, cursor:"pointer", fontSize:14 }}>
                  閉じる
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize:40, marginBottom:12 }}>🗑</div>
                <div style={{ fontWeight:800, fontSize:17, color:"#1a0a2e", marginBottom:12 }}>
                  アカウント削除を申請する
                </div>
                <div style={{ fontSize:13, color:"#666", lineHeight:1.7, marginBottom:24 }}>
                  管理者にメールで削除申請を送ります。<br />
                  削除されると<strong>すべてのデータが失われます。</strong>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setShowDeleteRequest(false)} disabled={deleteRequesting}
                    style={{ flex:1, background:"#f3f4f6", border:"none", borderRadius:10,
                      padding:"11px", fontWeight:600, cursor:"pointer", fontSize:14 }}>
                    キャンセル
                  </button>
                  <button onClick={handleDeleteRequest} disabled={deleteRequesting}
                    style={{ flex:1, background: deleteRequesting ? "#fca5a5" : "#ef4444",
                      color:"#fff", border:"none", borderRadius:10, padding:"11px",
                      fontWeight:800, cursor: deleteRequesting ? "not-allowed" : "pointer", fontSize:14 }}>
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
        <div style={{ position:"fixed", inset:0, background:"#0006", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setShowNameEdit(false)}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px", maxWidth:360, width:"90%", boxShadow:"0 8px 48px #0004" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:18, color:"#1a0a2e", marginBottom:20 }}>表示名を変更</div>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
              placeholder="例: 山田太郎"
              maxLength={30}
              autoFocus
              style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #e5e7eb", borderRadius:12,
                fontSize:15, outline:"none", color:"#1a0a2e", background:"#faf8f5",
                boxSizing:"border-box", fontFamily:"inherit", marginBottom:16 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowNameEdit(false)}
                style={{ flex:1, background:"#f3f4f6", border:"none", borderRadius:10, padding:"11px", fontWeight:600, cursor:"pointer" }}>
                キャンセル
              </button>
              <button onClick={handleSaveName} disabled={!nameInput.trim()}
                style={{ flex:2, background: nameInput.trim() ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "#c4b5fd",
                  color:"#fff", border:"none", borderRadius:10, padding:"11px", fontWeight:800, cursor: nameInput.trim() ? "pointer" : "not-allowed", fontSize:14 }}>
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"#0006", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", maxWidth:340, width:"90%", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🗑</div>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>本当に削除しますか？</div>
            <div style={{ color:"#888", fontSize:13, marginBottom:24 }}>この操作は元に戻せません。</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex:1, background:"#f3f4f6", border:"none", borderRadius:10, padding:"10px", fontWeight:600, cursor:"pointer" }}>キャンセル</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex:1, background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"10px", fontWeight:700, cursor:"pointer" }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* フォームモーダル */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"#0007", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 36px", maxWidth:520, width:"92%",
            maxHeight:"90vh", overflowY:"auto", boxShadow:"0 8px 48px #0004" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:800, fontSize:20, color:"#1a0a2e", marginBottom:24 }}>
              {editId ? "依頼を編集" : "新規依頼を登録"}
            </div>
            <div style={{ display:"grid", gap:16 }}>
              <Field label="件名 *"><input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="例: アイコン用イラスト" style={inp} /></Field>
              <Field label="絵師名 *"><input value={form.artist} onChange={e => setForm({...form, artist:e.target.value})} placeholder="例: 花咲りん" style={inp} /></Field>
              <Field label="X ID（任意）"><input value={form.x_id} onChange={e => setForm({...form, x_id:e.target.value})} placeholder="例: @artist_name" style={inp} /></Field>
              <DateField label="依頼日" value={form.ordered_at} onChange={v => setForm({...form, ordered_at:v})} />
              <DateField label="納期" value={form.deadline} onChange={v => setForm({...form, deadline:v})} />
              <DateField label="ラフ提出日（任意）" value={form.rough_date} onChange={v => setForm({...form, rough_date:v})} />
                <Field label="金額"><input type="number" min="0" value={form.price} onChange={e => setForm({...form, price:e.target.value})} placeholder="例: 5000" style={inp} /></Field>
              <Field label="ステータス">
                <select value={form.status} onChange={e => setForm({...form, status:e.target.value as CommissionStatus})} style={inp}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="メモ（任意）">
                <textarea value={form.notes} onChange={e => setForm({...form, notes:e.target.value})}
                  placeholder="色味の指定や注意点など" style={{ ...inp, minHeight:70, resize:"vertical" }} />
              </Field>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                style={{ flex:1, background:"#f3f4f6", border:"none", borderRadius:10, padding:"12px", fontWeight:600, cursor:"pointer" }}>キャンセル</button>
              <button onClick={handleSave} disabled={!form.title||!form.artist||saving}
                style={{ flex:2, background:(!form.title||!form.artist||saving)?"#c4b5fd":"linear-gradient(135deg,#7c3aed,#4f46e5)",
                  color:"#fff", border:"none", borderRadius:10, padding:"12px",
                  fontWeight:800, cursor:(!form.title||!form.artist||saving)?"not-allowed":"pointer", fontSize:15 }}>
                {saving?"保存中…":editId?"更新する":"登録する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
