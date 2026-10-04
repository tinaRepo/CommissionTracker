"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  supabase, adminFetchAllUsers, PLAN_LIMITS,
  type UserProfile, type Plan,
} from "@/lib/supabase";
import { Field, Icon, cx } from "@/components/TaskShared";

// ─── 型定義 ────────────────────────────────────────────────────

type TargetMode = "all" | "plan" | "user";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  published_at: string;
  created_at: string;
  updated_at: string;
  target_plans: Plan[] | null;
  target_user_ids: string[] | null;
};

type VersionRelease = {
  id: string;
  version: string;
  title: string;
  released_at: string;
  created_at: string;
  items: VersionReleaseItem[];
};

type VersionReleaseItem = {
  id?: string;
  category: ItemCategory;
  content: string;
  sort_order: number;
};

type AnnouncementType = "お知らせ" | "メンテナンス" | "障害情報" | "キャンペーン";
type ItemCategory = "新機能" | "改善" | "修正";
type Tab = "announcements" | "releases";

// ─── 定数 ──────────────────────────────────────────────────────

const ANNOUNCEMENT_TYPES: AnnouncementType[] = ["お知らせ", "メンテナンス", "障害情報", "キャンペーン"];
const ITEM_CATEGORIES: ItemCategory[] = ["新機能", "改善", "修正"];

const TYPE_CLASS: Record<AnnouncementType, string> = {
  お知らせ: "badge-info", メンテナンス: "badge-warn", 障害情報: "badge-danger", キャンペーン: "badge-success",
};
const CAT_CLASS: Record<ItemCategory, string> = {
  新機能: "badge-accent", 改善: "badge-success", 修正: "badge-warn",
};

const EMPTY_ANNOUNCEMENT = {
  title: "", content: "", type: "お知らせ" as AnnouncementType, published_at: "",
  targetMode: "all" as TargetMode,
  targetPlans: [] as Plan[],
  targetUserIds: [] as string[],
};
const EMPTY_ITEM = (): VersionReleaseItem => ({ category: "新機能", content: "", sort_order: 0 });

// ─── メインコンポーネント ──────────────────────────────────────

export default function AdminNotificationsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("announcements");

  // お知らせ
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [aLoading, setALoading] = useState(false);
  const [aForm, setAForm] = useState(EMPTY_ANNOUNCEMENT);
  const [aEditId, setAEditId] = useState<string | null>(null);
  const [showAForm, setShowAForm] = useState(false);
  const [aDeleteConfirm, setADeleteConfirm] = useState<string | null>(null);
  const [aSaving, setASaving] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userPickerSearch, setUserPickerSearch] = useState("");

  // バージョン
  const [releases, setReleases] = useState<VersionRelease[]>([]);
  const [rLoading, setRLoading] = useState(false);
  const [rForm, setRForm] = useState({ version: "", title: "", released_at: "" });
  const [rItems, setRItems] = useState<VersionReleaseItem[]>([EMPTY_ITEM()]);
  const [rEditId, setREditId] = useState<string | null>(null);
  const [showRForm, setShowRForm] = useState(false);
  const [rDeleteConfirm, setRDeleteConfirm] = useState<string | null>(null);
  const [rSaving, setRSaving] = useState(false);

  // 初期化
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase
        .from("user_profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!data?.is_admin) { router.replace("/forbidden"); return; }
      setChecking(false);
      fetchAnnouncements();
      fetchReleases();
      adminFetchAllUsers().then(setAllUsers).catch(() => { });
    })();
  }, []);

  // データ取得
  async function fetchAnnouncements() {
    setALoading(true);
    const { data, error } = await supabase.from("announcements").select("*").order("published_at", { ascending: false });
    if (error) console.error("announcements fetch error:", error);
    setAnnouncements(data ?? []);
    setALoading(false);
  }

  // データ取得
  async function fetchReleases() {
    setRLoading(true);
    const { data } = await supabase
      .from("version_releases")
      .select("*, version_release_items(*)")
      .order("released_at", { ascending: false });
    const formatted = (data ?? []).map(r => ({
      ...r,
      items: (r.version_release_items ?? []).sort(
        (a: VersionReleaseItem, b: VersionReleaseItem) => a.sort_order - b.sort_order
      ),
    }));
    setReleases(formatted);
    setRLoading(false);
  }

  // お知らせ編集
  function openANew() {
    setAEditId(null);
    setAForm({ ...EMPTY_ANNOUNCEMENT, published_at: today(), targetMode: "all", targetPlans: [], targetUserIds: [] });
    setShowAForm(true);
  }

  // お知らせ編集
  function openAEdit(a: Announcement) {
    setAEditId(a.id);
    setAForm({
      title: a.title, content: a.content, type: a.type,
      published_at: a.published_at.slice(0, 10),
      targetMode: a.target_user_ids?.length ? "user" : a.target_plans?.length ? "plan" : "all",
      targetPlans: a.target_plans ?? [],
      targetUserIds: a.target_user_ids ?? [],
    });
    setShowAForm(true);
  }

  // お知らせ保存
  async function saveAnnouncement() {
    if (!aForm.title.trim() || !aForm.content.trim()) return;
    setASaving(true);
    const payload = {
      title: aForm.title,
      content: aForm.content,
      type: aForm.type,
      published_at: aForm.published_at || today(),
      updated_at: todayISO(),
      target_plans: aForm.targetMode === "plan" && aForm.targetPlans.length > 0 ? aForm.targetPlans : null,
      target_user_ids: aForm.targetMode === "user" && aForm.targetUserIds.length > 0 ? aForm.targetUserIds : null,
    };
    if (aEditId) {
      await supabase.from("announcements").update(payload).eq("id", aEditId);
    } else {
      await supabase.from("announcements").insert(payload);
      sendPushNotification({
        title: payload.title,
        body: payload.content.length > 100 ? payload.content.slice(0, 100) + "…" : payload.content,
        targetPlans: (payload as any).target_plans ?? null,
        targetUserIds: (payload as any).target_user_ids ?? null,
      });
    }
    setASaving(false);
    setShowAForm(false);
    setAEditId(null);
    fetchAnnouncements();
  }

  // お知らせ削除
  async function deleteAnnouncement(id: string) {
    await supabase.from("announcements").delete().eq("id", id);
    setADeleteConfirm(null);
    fetchAnnouncements();
  }

  // バージョン編集
  function openRNew() {
    setREditId(null);
    setRForm({ version: "", title: "", released_at: today() });
    setRItems([EMPTY_ITEM()]);
    setShowRForm(true);
  }

  // バージョン編集
  function openREdit(r: VersionRelease) {
    setREditId(r.id);
    setRForm({ version: r.version, title: r.title, released_at: r.released_at.slice(0, 10) });
    setRItems(r.items.length > 0 ? r.items.map(i => ({ ...i })) : [EMPTY_ITEM()]);
    setShowRForm(true);
  }

  // バージョン保存
  async function saveRelease() {
    if (!rForm.version.trim() || !rForm.title.trim()) return;
    setRSaving(true);

    const validItems = rItems.filter(i => i.content.trim());

    if (rEditId) {
      await supabase.from("version_releases")
        .update({ version: rForm.version, title: rForm.title, released_at: rForm.released_at || today() })
        .eq("id", rEditId);
      await supabase.from("version_release_items").delete().eq("release_id", rEditId);
      if (validItems.length > 0) {
        await supabase.from("version_release_items").insert(
          validItems.map((item, idx) => ({ release_id: rEditId, category: item.category, content: item.content, sort_order: idx }))
        );
      }
    } else {
      const { data } = await supabase.from("version_releases")
        .insert({ version: rForm.version, title: rForm.title, released_at: rForm.released_at || today() })
        .select().single();
      if (data && validItems.length > 0) {
        await supabase.from("version_release_items").insert(
          validItems.map((item, idx) => ({ release_id: data.id, category: item.category, content: item.content, sort_order: idx }))
        );
      }
      sendPushNotification({
        title: "新しいバージョンがリリースされました",
        body: `v${rForm.version}: ${rForm.title}`,
      });
    }

    setRSaving(false);
    setShowRForm(false);
    setREditId(null);
    fetchReleases();
  }

  // バージョン削除
  async function sendPushNotification(payload: {
    title: string; body: string;
    targetPlans?: string[] | null; targetUserIds?: string[] | null;
  }) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      await fetch("/api/admin/notify-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } catch {
      // プッシュ通知の送信失敗はお知らせ自体の保存を妨げない
    }
  }

  async function deleteRelease(id: string) {
    await supabase.from("version_releases").delete().eq("id", id);
    setRDeleteConfirm(null);
    fetchReleases();
  }

  function addItem() {
    setRItems(prev => [...prev, { ...EMPTY_ITEM(), sort_order: prev.length }]);
  }

  function removeItem(idx: number) {
    setRItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<VersionReleaseItem>) {
    setRItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }

  function today() {
    const d = new Date();
    d.setTime(d.getTime() + 9 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  function todayISO() {
    const d = new Date();
    d.setTime(d.getTime() + 9 * 60 * 60 * 1000);
    return d.toISOString();
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--accent)", fontWeight: 700 }}>確認中…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>

      <header className="doc-header">
        <button onClick={() => router.back()} className="doc-back-btn">← 戻る</button>
        <div style={{ minWidth: 0 }}>
          <div className="title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>お知らせ・バージョン管理</div>
          <div className="text-meta" style={{ color: "var(--muted-on-inverse)", marginTop: 2 }}>管理者専用</div>
        </div>
      </header>

      <div className="container-narrow" style={{ paddingTop: 16 }}>
        <div className="row" style={{ gap: 4, background: "var(--bg)", borderRadius: "var(--radius-md)", padding: 4, border: "1px solid var(--border-soft)" }}>
          {([
            { id: "announcements" as Tab, label: "お知らせ", count: announcements.length },
            { id: "releases" as Tab, label: "バージョン管理", count: releases.length },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="row"
              style={{
                flex: 1, justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "none",
                fontSize: 13, fontWeight: 700,
                background: activeTab === tab.id ? "var(--accent)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--fg-2)",
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: 11,
                background: activeTab === tab.id ? "rgba(255,255,255,0.25)" : "var(--surface-2)",
                color: activeTab === tab.id ? "#fff" : "var(--muted)",
                borderRadius: 999, padding: "1px 7px",
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="container-narrow" style={{ padding: "16px 24px 60px" }}>

        {activeTab === "announcements" && (
          <>
            <div className="row" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={openANew} className="btn btn-primary btn-sm"><Icon name="plus" size={14} /> 新規作成</button>
            </div>

            {aLoading ? <LoadingState /> : announcements.length === 0 ? <EmptyState label="お知らせはまだありません" /> : (
              <div style={{ display: "grid", gap: 10 }}>
                {announcements.map(a => (
                  <div key={a.id} className="card" style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
                    <div className="row" style={{ gap: 10, minWidth: 0 }}>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                        <TypeBadge type={a.type} />
                        {(a.target_plans?.length || a.target_user_ids?.length) ? (
                          <span className="badge badge-warn">
                            {a.target_plans?.length ? "プラン限定" : `${a.target_user_ids?.length}名限定`}
                          </span>
                        ) : null}
                      </div>
                      <div className="grow">
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                        <div className="text-meta">{fmtDate(a.published_at)}</div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <ActionBtn label="編集" onClick={() => openAEdit(a)} />
                      <ActionBtn label="削除" danger onClick={() => setADeleteConfirm(a.id)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "releases" && (
          <>
            <div className="row" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={openRNew} className="btn btn-primary btn-sm"><Icon name="plus" size={14} /> 新規作成</button>
            </div>

            {rLoading ? <LoadingState /> : releases.length === 0 ? <EmptyState label="バージョンはまだありません" /> : (
              <div style={{ display: "grid", gap: 10 }}>
                {releases.map((r, i) => (
                  <div key={r.id} className="card" style={{ padding: "14px 16px", display: "grid", gap: 10 }}>
                    <div className="row" style={{ gap: 10, alignItems: "flex-start", minWidth: 0 }}>
                      <div style={{ flexShrink: 0 }}>
                        <div className="row" style={{ gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>v{r.version}</span>
                          {i === 0 && <span className="badge badge-accent">LATEST</span>}
                        </div>
                      </div>
                      <div className="grow">
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--fg-2)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.title}
                        </div>
                        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                          <span className="text-meta">{fmtDate(r.released_at)}</span>
                          {(["新機能", "改善", "修正"] as ItemCategory[])
                            .filter(cat => r.items.some(it => it.category === cat))
                            .map(cat => <CatBadge key={cat} cat={cat} />)}
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <ActionBtn label="編集" onClick={() => openREdit(r)} />
                      <ActionBtn label="削除" danger onClick={() => setRDeleteConfirm(r.id)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAForm && (
        <Modal
          onClose={() => setShowAForm(false)}
          title={aEditId ? "お知らせを編集" : "お知らせを新規作成"}
          footer={
            <ModalActions onCancel={() => setShowAForm(false)} onSubmit={saveAnnouncement}
              disabled={!aForm.title.trim() || !aForm.content.trim() || aSaving} saving={aSaving}
              submitLabel={aEditId ? "更新する" : "作成する"} />
          }
        >
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="タイトル *">
              <input value={aForm.title} onChange={e => setAForm({ ...aForm, title: e.target.value })}
                placeholder="例: 定期メンテナンスのお知らせ" className="input" />
            </Field>
            <Field label="本文 *">
              <textarea value={aForm.content} onChange={e => setAForm({ ...aForm, content: e.target.value })}
                placeholder="お知らせの本文を入力してください" rows={5} className="textarea" />
            </Field>
            <Field label="種別">
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {ANNOUNCEMENT_TYPES.map(type => (
                  <button key={type} onClick={() => setAForm({ ...aForm, type })}
                    className={cx("btn", "btn-sm", aForm.type === type ? "btn-primary" : "btn-secondary")}>
                    {type}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="配信対象">
              <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                {[{ key: "all", label: "全員" }, { key: "plan", label: "プラン指定" }, { key: "user", label: "ユーザー指定" }].map(m => (
                  <button key={m.key} onClick={() => setAForm({ ...aForm, targetMode: m.key as TargetMode })}
                    className={cx("btn", "btn-sm", aForm.targetMode === m.key ? "btn-primary" : "btn-secondary")}>
                    {m.label}
                  </button>
                ))}
              </div>

              {aForm.targetMode === "plan" && (
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {(["free", "standard", "premium"] as Plan[]).map(p => {
                    const checked = aForm.targetPlans.includes(p);
                    return (
                      <label key={p} className={cx("btn", "btn-sm", checked ? "btn-primary" : "btn-secondary")} style={{ cursor: "pointer" }}>
                        <input type="checkbox" checked={checked} style={{ display: "none" }}
                          onChange={() => setAForm({
                            ...aForm,
                            targetPlans: checked ? aForm.targetPlans.filter(x => x !== p) : [...aForm.targetPlans, p],
                          })} />
                        {PLAN_LIMITS[p].label}
                      </label>
                    );
                  })}
                </div>
              )}

              {aForm.targetMode === "user" && (
                <div>
                  <input value={userPickerSearch} onChange={e => setUserPickerSearch(e.target.value)}
                    placeholder="名前 / IDで検索…" className="input" style={{ marginBottom: 8 }} />
                  <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)" }}>
                    {allUsers
                      .filter(u => {
                        const q = userPickerSearch.toLowerCase();
                        return !q || u.id.toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
                      })
                      .map(u => {
                        const checked = aForm.targetUserIds.includes(u.id);
                        return (
                          <label key={u.id} className="row" style={{
                            gap: 8, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-soft)", fontSize: 13,
                            background: checked ? "var(--accent-soft)" : "transparent",
                          }}>
                            <input type="checkbox" checked={checked}
                              onChange={() => setAForm({
                                ...aForm,
                                targetUserIds: checked ? aForm.targetUserIds.filter(id => id !== u.id) : [...aForm.targetUserIds, u.id],
                              })} />
                            <span style={{ fontWeight: 600 }}>{u.display_name ?? "（未設定）"}</span>
                            <span className="text-meta">{u.id.slice(0, 8)}…</span>
                          </label>
                        );
                      })}
                  </div>
                  <div className="text-meta" style={{ marginTop: 6 }}>{aForm.targetUserIds.length}名を選択中</div>
                </div>
              )}
            </Field>
            <Field label="公開日">
              <input type="date" value={aForm.published_at} onChange={e => setAForm({ ...aForm, published_at: e.target.value })} className="input" />
            </Field>
          </div>
        </Modal>
      )}

      {showRForm && (
        <Modal
          onClose={() => setShowRForm(false)}
          title={rEditId ? "バージョンを編集" : "バージョンを新規作成"}
          footer={
            <ModalActions onCancel={() => setShowRForm(false)} onSubmit={saveRelease}
              disabled={!rForm.version.trim() || !rForm.title.trim() || rSaving} saving={rSaving}
              submitLabel={rEditId ? "更新する" : "作成する"} />
          }
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="バージョン番号 *">
                <input value={rForm.version} onChange={e => setRForm({ ...rForm, version: e.target.value })} placeholder="例: 2.1.0" className="input" />
              </Field>
              <Field label="リリース日">
                <input type="date" value={rForm.released_at} onChange={e => setRForm({ ...rForm, released_at: e.target.value })} className="input" />
              </Field>
            </div>
            <Field label="タイトル *">
              <input value={rForm.title} onChange={e => setRForm({ ...rForm, title: e.target.value })} placeholder="例: カレンダービュー追加・バグ修正" className="input" />
            </Field>
            <div>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <label className="field-label" style={{ margin: 0 }}>更新内容</label>
                <button onClick={addItem} className="btn btn-secondary btn-sm">＋ 追加</button>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 8 }}>
                {rItems.map((item, idx) => (
                  <div key={idx} className="row" style={{ gap: 8, flexWrap: "wrap", background: "var(--surface)", borderRadius: "var(--radius-md)", padding: "10px 12px", border: "1px solid var(--border-soft)" }}>
                    <select value={item.category} onChange={e => updateItem(idx, { category: e.target.value as ItemCategory })}
                      className="select" style={{ width: "auto", padding: "7px 10px", fontWeight: 700 }}>
                      {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={item.content} onChange={e => updateItem(idx, { content: e.target.value })}
                      placeholder="例: カレンダービューを追加しました" className="input" style={{ flex: 1, minWidth: 120 }} />
                    <button onClick={() => removeItem(idx)} disabled={rItems.length === 1} className="icon-btn"
                      style={{ width: 28, height: 28, background: rItems.length === 1 ? "var(--surface-2)" : "var(--danger-soft)", color: rItems.length === 1 ? "var(--meta)" : "var(--danger)", border: "none" }}>
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {aDeleteConfirm && <DeleteConfirmModal onCancel={() => setADeleteConfirm(null)} onConfirm={() => deleteAnnouncement(aDeleteConfirm)} />}
      {rDeleteConfirm && <DeleteConfirmModal onCancel={() => setRDeleteConfirm(null)} onConfirm={() => deleteRelease(rDeleteConfirm)} />}

    </div>
  );
}

// ─── 共通サブコンポーネント ─────────────────────────────────────

function LoadingState() {
  return <div style={{ textAlign: "center", padding: "48px 0", color: "var(--accent)", fontWeight: 700 }}>読み込み中…</div>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", background: "var(--bg)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border)", color: "var(--meta)", fontSize: 14 }}>
      {label}
    </div>
  );
}

function TypeBadge({ type }: { type: AnnouncementType }) {
  return <span className={cx("badge", TYPE_CLASS[type])}>{type}</span>;
}

function CatBadge({ cat }: { cat: ItemCategory }) {
  return <span className={cx("badge", CAT_CLASS[cat])}>{cat}</span>;
}

function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx("btn", "btn-sm", danger ? "btn-danger" : "btn-secondary")}>
      {label}
    </button>
  );
}

function Modal({ title, footer, children, onClose }: {
  title: React.ReactNode; footer: React.ReactNode; children: React.ReactNode; onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>{title}</div>
        </div>
        <div className="modal-body" style={{ padding: "4px 24px 0" }}>{children}</div>
        <div className="modal-footer">{footer}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSubmit, disabled, saving, submitLabel }: {
  onCancel: () => void; onSubmit: () => void; disabled: boolean; saving: boolean; submitLabel: string;
}) {
  return (
    <div className="row" style={{ gap: 10, marginTop: 20 }}>
      <button onClick={onCancel} className="btn btn-secondary" style={{ flex: 1 }}>キャンセル</button>
      <button onClick={onSubmit} disabled={disabled} className="btn btn-primary" style={{ flex: 2 }}>
        {saving ? "保存中…" : submitLabel}
      </button>
    </div>
  );
}

function DeleteConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal-compact" style={{ maxWidth: 340 }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>本当に削除しますか？</div>
        <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>この操作は元に戻せません。</div>
        <div className="row" style={{ gap: 10 }}>
          <button onClick={onCancel} className="btn btn-secondary" style={{ flex: 1 }}>キャンセル</button>
          <button onClick={onConfirm} className="btn btn-danger-solid" style={{ flex: 1 }}>削除する</button>
        </div>
      </div>
    </div>
  );
}
