"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── 型定義 ────────────────────────────────────────────────────

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  published_at: string;
  created_at: string;
  updated_at: string;
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
  id?: string;       // 既存レコードはあり、新規追加時はなし
  category: ItemCategory;
  content: string;
  sort_order: number;
};

type AnnouncementType = "お知らせ" | "メンテナンス" | "障害情報" | "キャンペーン";
type ItemCategory    = "新機能" | "改善" | "修正";
type Tab             = "announcements" | "releases";

// ─── 定数 ──────────────────────────────────────────────────────

const ANNOUNCEMENT_TYPES: AnnouncementType[] = ["お知らせ", "メンテナンス", "障害情報", "キャンペーン"];
const ITEM_CATEGORIES:    ItemCategory[]      = ["新機能", "改善", "修正"];

const TYPE_COLOR: Record<AnnouncementType, { bg: string; color: string; border: string }> = {
  お知らせ:     { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  メンテナンス: { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
  障害情報:     { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
  キャンペーン: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
};

const CAT_COLOR: Record<ItemCategory, { bg: string; color: string; border: string }> = {
  新機能: { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  改善:   { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  修正:   { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
};

// ─── 入力スタイル（既存アプリに揃える）──────────────────────────

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 13px", border: "1.5px solid #e5e7eb", borderRadius: 12,
  fontSize: 16, outline: "none", color: "#1a0a2e", background: "#faf8f5",
  boxSizing: "border-box", fontFamily: "inherit",
};

const EMPTY_ANNOUNCEMENT = { title: "", content: "", type: "お知らせ" as AnnouncementType, published_at: "" };
const EMPTY_ITEM = (): VersionReleaseItem => ({ category: "新機能", content: "", sort_order: 0 });

// ─── メインコンポーネント ──────────────────────────────────────

export default function AdminNotificationsPage() {
  const router = useRouter();

  const [checking, setChecking]         = useState(true);
  const [activeTab, setActiveTab]       = useState<Tab>("announcements");

  // お知らせ
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [aLoading, setALoading]           = useState(false);
  const [aForm, setAForm]                 = useState(EMPTY_ANNOUNCEMENT);
  const [aEditId, setAEditId]             = useState<string | null>(null);
  const [showAForm, setShowAForm]         = useState(false);
  const [aDeleteConfirm, setADeleteConfirm] = useState<string | null>(null);
  const [aSaving, setASaving]             = useState(false);

  // バージョン
  const [releases, setReleases]           = useState<VersionRelease[]>([]);
  const [rLoading, setRLoading]           = useState(false);
  const [rForm, setRForm]                 = useState({ version: "", title: "", released_at: "" });
  const [rItems, setRItems]               = useState<VersionReleaseItem[]>([EMPTY_ITEM()]);
  const [rEditId, setREditId]             = useState<string | null>(null);
  const [showRForm, setShowRForm]         = useState(false);
  const [rDeleteConfirm, setRDeleteConfirm] = useState<string | null>(null);
  const [rSaving, setRSaving]             = useState(false);

  // ── 管理者チェック ─────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase
        .from("user_profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!data?.is_admin) { router.replace("/"); return; }
      setChecking(false);
      fetchAnnouncements();
      fetchReleases();
    })();
  }, []);

  // ── データ取得 ─────────────────────────────────────────────

  async function fetchAnnouncements() {
    setALoading(true);
    const { data, error } = await supabase.from("announcements").select("*").order("published_at", { ascending: false });
    if (error) console.error("announcements fetch error:", error);
    setAnnouncements(data ?? []);
    setALoading(false);
  }

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

  // ── お知らせ CRUD ──────────────────────────────────────────

  function openANew() {
    setAEditId(null);
    setAForm({ ...EMPTY_ANNOUNCEMENT, published_at: today() });
    setShowAForm(true);
  }

  function openAEdit(a: Announcement) {
    setAEditId(a.id);
    setAForm({
      title: a.title, content: a.content, type: a.type,
      published_at: a.published_at.slice(0, 10),
    });
    setShowAForm(true);
  }

  async function saveAnnouncement() {
    if (!aForm.title.trim() || !aForm.content.trim()) return;
    setASaving(true);
    const payload = { ...aForm, published_at: aForm.published_at || today(), updated_at: todayISO() };
    if (aEditId) {
      await supabase.from("announcements").update(payload).eq("id", aEditId);
    } else {
      await supabase.from("announcements").insert(payload);
    }
    setASaving(false);
    setShowAForm(false);
    setAEditId(null);
    fetchAnnouncements();
  }

  async function deleteAnnouncement(id: string) {
    await supabase.from("announcements").delete().eq("id", id);
    setADeleteConfirm(null);
    fetchAnnouncements();
  }

  // ── バージョン CRUD ────────────────────────────────────────

  function openRNew() {
    setREditId(null);
    setRForm({ version: "", title: "", released_at: today() });
    setRItems([EMPTY_ITEM()]);
    setShowRForm(true);
  }

  function openREdit(r: VersionRelease) {
    setREditId(r.id);
    setRForm({ version: r.version, title: r.title, released_at: r.released_at.slice(0, 10) });
    setRItems(r.items.length > 0 ? r.items.map(i => ({ ...i })) : [EMPTY_ITEM()]);
    setShowRForm(true);
  }

  async function saveRelease() {
    if (!rForm.version.trim() || !rForm.title.trim()) return;
    setRSaving(true);

    const validItems = rItems.filter(i => i.content.trim());

    if (rEditId) {
      // バージョン本体を更新
      await supabase.from("version_releases")
        .update({ version: rForm.version, title: rForm.title, released_at: rForm.released_at || today() })
        .eq("id", rEditId);
      // items は全削除→再挿入
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
    }

    setRSaving(false);
    setShowRForm(false);
    setREditId(null);
    fetchReleases();
  }

  async function deleteRelease(id: string) {
    // version_release_items は cascade で自動削除
    await supabase.from("version_releases").delete().eq("id", id);
    setRDeleteConfirm(null);
    fetchReleases();
  }

  // ── 更新内容の行操作 ───────────────────────────────────────

  function addItem() {
    setRItems(prev => [...prev, { ...EMPTY_ITEM(), sort_order: prev.length }]);
  }

  function removeItem(idx: number) {
    setRItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<VersionReleaseItem>) {
    setRItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }

  // ── ユーティリティ ─────────────────────────────────────────

  // JST基準の日付文字列 "YYYY-MM-DD"
  function today() {
    const d = new Date();
    d.setTime(d.getTime() + 9 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  // JST基準のISO datetime文字列（updated_at用）
  function todayISO() {
    const d = new Date();
    d.setTime(d.getTime() + 9 * 60 * 60 * 1000);
    return d.toISOString();
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
  }

  // ── レンダリング ───────────────────────────────────────────

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7ff" }}>
        <p style={{ color: "#7c3aed", fontWeight: 700 }}>確認中…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9f7ff", fontFamily: "inherit" }}>

      {/* ── ヘッダー ── */}
      <header style={{
        background: "linear-gradient(135deg,#1a0a2e,#2d1b69)",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "#ffffff18", border: "1px solid #ffffff30", color: "#fff",
            borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ← 戻る
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>お知らせ・バージョン管理</div>
          <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 2 }}>管理者専用</div>
        </div>
      </header>

      {/* ── タブ ── */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{
          display: "flex", gap: 4,
          background: "#ede9fe", borderRadius: 12, padding: 4,
        }}>
          {([
            { id: "announcements" as Tab, label: "📢 お知らせ",      count: announcements.length },
            { id: "releases"      as Tab, label: "🚀 バージョン管理", count: releases.length },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                background: activeTab === tab.id ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "#7c3aed",
                boxShadow: activeTab === tab.id ? "0 2px 8px #7c3aed40" : "none",
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: 11,
                background: activeTab === tab.id ? "#ffffff30" : "#c4b5fd",
                color: activeTab === tab.id ? "#fff" : "#6d28d9",
                borderRadius: 999, padding: "1px 7px", flexShrink: 0,
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── コンテンツ ── */}
      <div style={{ padding: "16px 16px 60px", maxWidth: 860 }}>

        {/* ════ お知らせ一覧 ════ */}
        {activeTab === "announcements" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={openANew} style={{
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
                border: "none", borderRadius: 12, padding: "10px 22px",
                fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 12px #7c3aed40",
              }}>
                ＋ 新規作成
              </button>
            </div>

            {aLoading ? (
              <LoadingState />
            ) : announcements.length === 0 ? (
              <EmptyState label="お知らせはまだありません" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {announcements.map(a => (
                  <div key={a.id} style={{
                    background: "#fff", borderRadius: 14, padding: "14px 16px",
                    boxShadow: "0 1px 6px #0001", border: "1.5px solid #f3f4f6",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    {/* 上段：バッジ＋タイトル */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <TypeBadge type={a.type} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a0a2e", marginBottom: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#bbb" }}>{fmtDate(a.published_at)}</div>
                      </div>
                    </div>
                    {/* 下段：アクション */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <ActionBtn label="編集" onClick={() => openAEdit(a)} />
                      <ActionBtn label="削除" danger onClick={() => setADeleteConfirm(a.id)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════ バージョン一覧 ════ */}
        {activeTab === "releases" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={openRNew} style={{
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
                border: "none", borderRadius: 12, padding: "10px 22px",
                fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 12px #7c3aed40",
              }}>
                ＋ 新規作成
              </button>
            </div>

            {rLoading ? (
              <LoadingState />
            ) : releases.length === 0 ? (
              <EmptyState label="バージョンはまだありません" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {releases.map((r, i) => (
                  <div key={r.id} style={{
                    background: "#fff", borderRadius: 14, padding: "14px 16px",
                    boxShadow: "0 1px 6px #0001", border: "1.5px solid #f3f4f6",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    {/* 上段：バージョン番号＋タイトル */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: "#1a0a2e" }}>v{r.version}</span>
                          {i === 0 && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                              background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
                            }}>LATEST</span>
                          )}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#444", marginBottom: 4,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.title}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#bbb" }}>{fmtDate(r.released_at)}</span>
                          {r.items.length > 0 && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {(["新機能", "改善", "修正"] as ItemCategory[])
                                .filter(cat => r.items.some(it => it.category === cat))
                                .map(cat => <CatBadge key={cat} cat={cat} />)
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 下段：アクション */}
                    <div style={{ display: "flex", gap: 8 }}>
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

      {/* ════ お知らせ登録・編集モーダル ════ */}
      {showAForm && (
        <Modal
          onClose={() => setShowAForm(false)}
          title={aEditId ? "お知らせを編集" : "お知らせを新規作成"}
          footer={
            <ModalActions
              onCancel={() => setShowAForm(false)}
              onSubmit={saveAnnouncement}
              disabled={!aForm.title.trim() || !aForm.content.trim() || aSaving}
              saving={aSaving}
              submitLabel={aEditId ? "更新する" : "作成する"}
            />
          }
        >
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="タイトル *">
              <input
                value={aForm.title}
                onChange={e => setAForm({ ...aForm, title: e.target.value })}
                placeholder="例: 定期メンテナンスのお知らせ"
                style={inp}
                autoFocus
              />
            </Field>
            <Field label="本文 *">
              <textarea
                value={aForm.content}
                onChange={e => setAForm({ ...aForm, content: e.target.value })}
                placeholder="お知らせの本文を入力してください"
                rows={5}
                style={{ ...inp, resize: "vertical", lineHeight: 1.7 }}
              />
            </Field>
            <Field label="種別">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ANNOUNCEMENT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setAForm({ ...aForm, type })}
                    style={{
                      padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${aForm.type === type ? TYPE_COLOR[type].border : "#e5e7eb"}`,
                      background: aForm.type === type ? TYPE_COLOR[type].bg : "#fff",
                      color: aForm.type === type ? TYPE_COLOR[type].color : "#888",
                      transition: "all 0.1s",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="公開日">
              <input type="date" value={aForm.published_at} onChange={e => setAForm({ ...aForm, published_at: e.target.value })} style={inp} />
            </Field>
          </div>
        </Modal>
      )}

      {/* ════ バージョン登録・編集モーダル ════ */}
      {showRForm && (
        <Modal
          onClose={() => setShowRForm(false)}
          title={rEditId ? "バージョンを編集" : "バージョンを新規作成"}
          footer={
            <ModalActions
              onCancel={() => setShowRForm(false)}
              onSubmit={saveRelease}
              disabled={!rForm.version.trim() || !rForm.title.trim() || rSaving}
              saving={rSaving}
              submitLabel={rEditId ? "更新する" : "作成する"}
            />
          }
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="バージョン番号 *">
                <input
                  value={rForm.version}
                  onChange={e => setRForm({ ...rForm, version: e.target.value })}
                  placeholder="例: 1.2.0"
                  style={inp}
                  autoFocus
                />
              </Field>
              <Field label="リリース日">
                <input type="date" value={rForm.released_at} onChange={e => setRForm({ ...rForm, released_at: e.target.value })} style={inp} />
              </Field>
            </div>
            <Field label="タイトル *">
              <input
                value={rForm.title}
                onChange={e => setRForm({ ...rForm, title: e.target.value })}
                placeholder="例: カレンダービュー追加・バグ修正"
                style={inp}
              />
            </Field>
            {/* 更新内容 */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>更新内容</label>
                <button
                  onClick={addItem}
                  style={{
                    background: "#ede9fe", color: "#7c3aed", border: "none",
                    borderRadius: 8, padding: "5px 12px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  ＋ 追加
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rItems.map((item, idx) => (
                  <div key={idx} style={{
                    display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
                    background: "#f9f7ff", borderRadius: 10, padding: "10px 12px",
                    border: "1.5px solid #ede9fe",
                  }}>
                    <select
                      value={item.category}
                      onChange={e => updateItem(idx, { category: e.target.value as ItemCategory })}
                      style={{
                        padding: "7px 10px", border: `1.5px solid ${CAT_COLOR[item.category].border}`,
                        borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer",
                        background: CAT_COLOR[item.category].bg, color: CAT_COLOR[item.category].color,
                        outline: "none",
                      }}
                    >
                      {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                      value={item.content}
                      onChange={e => updateItem(idx, { content: e.target.value })}
                      placeholder="例: カレンダービューを追加しました"
                      style={{ ...inp, background: "#fff", flex: 1, minWidth: 120 }}
                    />
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={rItems.length === 1}
                      style={{
                        width: 28, height: 28, borderRadius: "50%", border: "none", cursor: rItems.length === 1 ? "not-allowed" : "pointer",
                        background: rItems.length === 1 ? "#f3f4f6" : "#fee2e2",
                        color: rItems.length === 1 ? "#ccc" : "#ef4444",
                        fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ════ 削除確認モーダル（お知らせ）════ */}
      {aDeleteConfirm && (
        <DeleteConfirmModal
          onCancel={() => setADeleteConfirm(null)}
          onConfirm={() => deleteAnnouncement(aDeleteConfirm)}
        />
      )}

      {/* ════ 削除確認モーダル（バージョン）════ */}
      {rDeleteConfirm && (
        <DeleteConfirmModal
          onCancel={() => setRDeleteConfirm(null)}
          onConfirm={() => deleteRelease(rDeleteConfirm)}
        />
      )}

    </div>
  );
}

// ─── 共通サブコンポーネント ─────────────────────────────────────

function LoadingState() {
  return <div style={{ textAlign: "center", padding: "48px 0", color: "#7c3aed", fontWeight: 700 }}>読み込み中…</div>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      textAlign: "center", padding: "60px 0",
      background: "#fff", borderRadius: 16, border: "1.5px dashed #e5e7eb",
      color: "#bbb", fontSize: 14,
    }}>
      {label}
    </div>
  );
}

function TypeBadge({ type }: { type: AnnouncementType }) {
  const c = TYPE_COLOR[type];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 6, flexShrink: 0,
      fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {type}
    </span>
  );
}

function CatBadge({ cat }: { cat: ItemCategory }) {
  const c = CAT_COLOR[cat];
  return (
    <span style={{
      display: "inline-block", padding: "1px 7px", borderRadius: 4,
      fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {cat}
    </span>
  );
}

function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
        fontSize: 12, fontWeight: 700, transition: "opacity 0.1s",
        background: danger ? "#fee2e2" : "#ede9fe",
        color: danger ? "#b91c1c" : "#6d28d9",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.75"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, footer, children, onClose }: {
  title: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, []);
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 20, maxWidth: 540, width: "100%", height: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 48px #0004" }}
        onClick={e => e.stopPropagation()}
      >
        {/* タイトル（固定） */}
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#1a0a2e", marginBottom: 16 }}>{title}</div>
        </div>
        {/* フォーム（スクロール） */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
          {children}
        </div>
        {/* ボタン（固定） */}
        <div style={{ padding: "0 20px 20px", flexShrink: 0 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}
function ModalActions({ onCancel, onSubmit, disabled, saving, submitLabel }: {
  onCancel: () => void; onSubmit: () => void;
  disabled: boolean; saving: boolean; submitLabel: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
      <button onClick={onCancel} style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, cursor: "pointer" }}>
        キャンセル
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        style={{
          flex: 2, color: "#fff", border: "none", borderRadius: 10, padding: "12px",
          fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer",
          background: disabled ? "#c4b5fd" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
        }}
      >
        {saving ? "保存中…" : submitLabel}
      </button>
    </div>
  );
}

function DeleteConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0007", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "32px", maxWidth: 340, width: "90%", textAlign: "center", boxShadow: "0 8px 48px #0004" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#1a0a2e", marginBottom: 10 }}>本当に削除しますか？</div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7, marginBottom: 24 }}>この操作は元に戻せません。</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 10, padding: "11px", fontWeight: 600, cursor: "pointer" }}>
            キャンセル
          </button>
          <button onClick={onConfirm} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontWeight: 800, cursor: "pointer" }}>
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
