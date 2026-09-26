"use client";

import { useState, useEffect } from "react";
import type { Announcement, VersionRelease } from "@/hooks/useNotifications";

// ─── 定数 ──────────────────────────────────────────────────────

const TYPE_CONFIG = {
  お知らせ: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  メンテナンス: { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
  障害情報: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
  キャンペーン: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
} as const;

const CATEGORY_CONFIG = {
  新機能: { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  改善: { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  修正: { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
} as const;

type Tab = "announcements" | "releases";

// ─── Props ─────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  announcements: Announcement[];
  releases: VersionRelease[];
  unreadAnnouncementIds: Set<string>;
  hasUnreadRelease: boolean;
  loading: boolean;
  onMarkAnnouncementRead: (id: string) => Promise<void> | void;
  onMarkReleasesRead: () => Promise<void> | void;
};

// ─── メインコンポーネント ──────────────────────────────────────

export default function NotificationsModal({
  open,
  onClose,
  announcements,
  releases,
  unreadAnnouncementIds,
  hasUnreadRelease,
  loading,
  onMarkAnnouncementRead,
  onMarkReleasesRead,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("announcements");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // モーダルを開くたびにタブ・選択状態だけリセットする（データ自体は親から渡されるため再取得不要）
  useEffect(() => {
    if (open) {
      setActiveTab("announcements");
      setSelectedAnnouncement(null);
    }
  }, [open]);

  // Escキーで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // スクロールロック
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSelectedAnnouncement(null);
    if (tab === "releases" && hasUnreadRelease) await onMarkReleasesRead();
  }

  async function handleAnnouncementClick(a: Announcement) {
    setSelectedAnnouncement(a);
    if (unreadAnnouncementIds.has(a.id)) await onMarkAnnouncementRead(a.id);
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  }

  const unreadAnnouncementCount = unreadAnnouncementIds.size;
  const totalUnreadCount = unreadAnnouncementCount + (hasUnreadRelease ? 1 : 0);

  if (!open) return null;

  const S = {
    overlay: {
      position: "fixed" as const, inset: 0, background: "#0006", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
      animation: "fadeIn 0.15s ease",
    },
    modal: {
      background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520,
      height: "78vh", display: "flex", flexDirection: "column" as const,
      boxShadow: "0 8px 48px #0004",
      animation: "slideUp 0.2s ease",
    },
    modalHeader: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 24px 0",
      flexShrink: 0,
    },
    title: {
      display: "flex", alignItems: "center", gap: 8,
      fontWeight: 800, fontSize: 18, color: "#1a0a2e",
    },
    closeBtn: {
      width: 32, height: 32, borderRadius: "50%", border: "none",
      background: "#f3f4f6", cursor: "pointer", fontSize: 18, color: "#888",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    tabBar: {
      display: "flex", gap: 4, margin: "16px 24px 0",
      background: "#f3f4f6", borderRadius: 10, padding: 4,
      flexShrink: 0,
    },
    body: {
      flex: 1, overflowY: "auto" as const, padding: "16px 24px 24px",
    },
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        .notif-card:hover { background: #faf8f5 !important; }
        .notif-tab-active   { background: #fff !important; color: #1a0a2e !important; font-weight: 700 !important; box-shadow: 0 1px 4px #0001 !important; }
        .notif-tab-inactive { background: transparent !important; color: #888 !important; }
        .notif-close:hover  { background: #e5e7eb !important; }
      `}</style>

      <div style={S.overlay} onClick={onClose}>
        <div style={S.modal} onClick={e => e.stopPropagation()}>

          {/* ── ヘッダー ── */}
          <div style={S.modalHeader}>
            <div style={S.title}>
              <span>🔔</span>
              <span>お知らせ</span>
              {totalUnreadCount > 0 && (
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 999, padding: "0 5px",
                  background: "#ef4444", color: "#fff",
                  fontSize: 11, fontWeight: 700, lineHeight: "20px", textAlign: "center",
                }}>
                  {totalUnreadCount}
                </span>
              )}
            </div>
            <button className="notif-close" style={S.closeBtn} onClick={onClose} title="閉じる">
              ✕
            </button>
          </div>

          {/* ── タブバー ── */}
          <div style={S.tabBar}>
            {([
              { id: "announcements" as Tab, label: "お知らせ", badge: unreadAnnouncementCount },
              { id: "releases" as Tab, label: "リリースノート", badge: hasUnreadRelease ? 1 : 0 },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={activeTab === tab.id ? "notif-tab-active" : "notif-tab-inactive"}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 13, transition: "all 0.15s",
                }}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, borderRadius: 999, padding: "0 4px",
                    background: "#ef4444", color: "#fff",
                    fontSize: 10, fontWeight: 700, lineHeight: "18px", textAlign: "center",
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── ボディ ── */}
          <div style={S.body}>

            {loading && announcements.length === 0 && releases.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#7c3aed", fontWeight: 700 }}>
                読み込み中…
              </div>
            )}

            {/* お知らせ一覧 */}
            {activeTab === "announcements" && !selectedAnnouncement && !(loading && announcements.length === 0) && (
              announcements.length === 0
                ? <EmptyState label="お知らせはありません" />
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {announcements.map(a => (
                    <AnnouncementRow
                      key={a.id}
                      announcement={a}
                      isUnread={unreadAnnouncementIds.has(a.id)}
                      formatDate={formatDate}
                      onClick={() => handleAnnouncementClick(a)}
                    />
                  ))}
                </div>
            )}

            {/* お知らせ詳細 */}
            {activeTab === "announcements" && selectedAnnouncement && (
              <AnnouncementDetail
                announcement={selectedAnnouncement}
                formatDate={formatDate}
                onBack={() => setSelectedAnnouncement(null)}
              />
            )}

            {/* リリースノート */}
            {activeTab === "releases" && !(loading && releases.length === 0) && (
              releases.length === 0
                ? <EmptyState label="リリースノートはありません" />
                : <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {releases.map((r, i) => (
                    <ReleaseSection key={r.id} release={r} isLatest={i === 0} formatDate={formatDate} />
                  ))}
                </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ─── サブコンポーネント ─────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>
      {label}
    </div>
  );
}

function TypeBadge({ type }: { type: keyof typeof TYPE_CONFIG }) {
  const c = TYPE_CONFIG[type];
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {type}
    </span>
  );
}

function CategoryBadge({ cat }: { cat: keyof typeof CATEGORY_CONFIG }) {
  const c = CATEGORY_CONFIG[cat];
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {cat}
    </span>
  );
}

function AnnouncementRow({
  announcement, isUnread, formatDate, onClick,
}: {
  announcement: Announcement;
  isUnread: boolean;
  formatDate: (s: string) => string;
  onClick: () => void;
}) {
  return (
    <button
      className="notif-card"
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        display: "flex", alignItems: "center", gap: 12,
        padding: "13px 14px",
        background: "#fff",
        border: isUnread ? "1.5px solid #c4b5fd" : "1.5px solid #f3f4f6",
        borderRadius: 14, cursor: "pointer",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
        background: isUnread ? "#ef4444" : "transparent",
        marginTop: 1,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
          <TypeBadge type={announcement.type} />
          <span style={{ fontSize: 11, color: "#bbb" }}>{formatDate(announcement.published_at)}</span>
        </div>
        <p style={{
          margin: 0, fontSize: 14,
          fontWeight: isUnread ? 700 : 500,
          color: "#1a0a2e",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {announcement.title}
        </p>
      </div>
      <span style={{ fontSize: 18, color: "#ccc", flexShrink: 0 }}>›</span>
    </button>
  );
}

function AnnouncementDetail({
  announcement, formatDate, onBack,
}: {
  announcement: Announcement;
  formatDate: (s: string) => string;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, color: "#7c3aed", fontWeight: 600,
          padding: "0 0 16px", marginBottom: 4,
        }}
      >
        ← 一覧に戻る
      </button>
      <div style={{
        padding: "16px", borderRadius: 14,
        background: TYPE_CONFIG[announcement.type].bg,
        border: `1px solid ${TYPE_CONFIG[announcement.type].border}`,
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <TypeBadge type={announcement.type} />
          <span style={{ fontSize: 12, color: "#999" }}>{formatDate(announcement.published_at)}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a0a2e", lineHeight: 1.4 }}>
          {announcement.title}
        </h2>
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.85, color: "#444", whiteSpace: "pre-wrap" }}>
        {announcement.content}
      </p>
    </div>
  );
}

function ReleaseSection({
  release, isLatest, formatDate,
}: {
  release: VersionRelease;
  isLatest: boolean;
  formatDate: (s: string) => string;
}) {
  const grouped = {
    新機能: release.items.filter(i => i.category === "新機能"),
    改善: release.items.filter(i => i.category === "改善"),
    修正: release.items.filter(i => i.category === "修正"),
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#1a0a2e", fontVariantNumeric: "tabular-nums" }}>
          v{release.version}
        </span>
        {isLatest && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff",
          }}>
            LATEST
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#bbb", fontWeight: 500 }}>
          {formatDate(release.released_at)}
        </span>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#888", fontWeight: 600 }}>
        {release.title}
      </p>
      {release.items.length > 0 && (
        <div style={{ borderRadius: 14, border: "1.5px solid #f3f4f6", overflow: "hidden", background: "#fff" }}>
          {(["新機能", "改善", "修正"] as const).map((cat, idx, arr) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            const isLast = arr.slice(idx + 1).every(c => grouped[c].length === 0);
            return (
              <div key={cat} style={{ padding: "12px 16px", borderBottom: isLast ? "none" : "1.5px solid #f3f4f6" }}>
                <CategoryBadge cat={cat} />
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, listStyle: "disc" }}>
                  {items.map(item => (
                    <li key={item.id} style={{ fontSize: 13, color: "#333", lineHeight: 1.75 }}>
                      {item.content}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {!isLatest && <div style={{ marginTop: 28, borderTop: "1px dashed #f0eefc" }} />}
    </div>
  );
}
