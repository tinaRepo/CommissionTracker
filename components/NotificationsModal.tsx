"use client";

import { useState, useEffect } from "react";
import type { Announcement, VersionRelease } from "@/hooks/useNotifications";
import { Icon, cx } from "@/components/TaskShared";

const TYPE_CLASS: Record<string, string> = {
  お知らせ: "badge-info",
  メンテナンス: "badge-warn",
  障害情報: "badge-danger",
  キャンペーン: "badge-success",
};

const CATEGORY_CLASS: Record<string, string> = {
  新機能: "badge-accent",
  改善: "badge-success",
  修正: "badge-warn",
};

type Tab = "announcements" | "releases";

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

export default function NotificationsModal({
  open, onClose, announcements, releases, unreadAnnouncementIds, hasUnreadRelease,
  loading, onMarkAnnouncementRead, onMarkReleasesRead,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("announcements");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab("announcements");
      setSelectedAnnouncement(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

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
    if (unreadAnnouncementIds.has(a.id)) {
      try {
        await onMarkAnnouncementRead(a.id);
      } catch (error) {
        console.error("mark announcement read error:", error);
        alert("お知らせを既読にできませんでした。通信状態を確認して、もう一度お試しください。");
      }
    }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  }

  const unreadAnnouncementCount = unreadAnnouncementIds.size;
  const totalUnreadCount = unreadAnnouncementCount + (hasUnreadRelease ? 1 : 0);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: 520, maxHeight: "78vh" }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>お知らせ</span>
              {totalUnreadCount > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 999, padding: "0 5px",
                  background: "var(--danger)", color: "#fff",
                  fontSize: 10, fontWeight: 700, lineHeight: "18px", textAlign: "center",
                }}>
                  {totalUnreadCount}
                </span>
              )}
            </div>
            <button onClick={onClose} className="icon-btn"
              style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", color: "var(--fg)", width: 32, height: 32 }}>
              <Icon name="close" size={14} />
            </button>
          </div>

          <div className="row" style={{ gap: 4, margin: "16px 0 0", background: "var(--surface)", borderRadius: "var(--radius-md)", padding: 4 }}>
            {([
              { id: "announcements" as Tab, label: "お知らせ", badge: unreadAnnouncementCount },
              { id: "releases" as Tab, label: "リリースノート", badge: hasUnreadRelease ? 1 : 0 },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="row"
                style={{
                  flex: 1, justifyContent: "center", gap: 6, padding: "7px 0", borderRadius: "var(--radius-sm)",
                  border: "none", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                  background: activeTab === tab.id ? "var(--bg)" : "transparent",
                  color: activeTab === tab.id ? "var(--fg)" : "var(--muted)",
                  boxShadow: activeTab === tab.id ? "var(--shadow-xs)" : "none",
                }}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span style={{
                    minWidth: 16, height: 16, borderRadius: 999, padding: "0 4px",
                    background: "var(--danger)", color: "#fff", fontSize: 9, fontWeight: 700, lineHeight: "16px", textAlign: "center",
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body" style={{ padding: "16px 24px 24px" }}>
          {loading && announcements.length === 0 && releases.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--accent)", fontWeight: 600 }}>読み込み中…</div>
          )}

          {activeTab === "announcements" && !selectedAnnouncement && !(loading && announcements.length === 0) && (
            announcements.length === 0
              ? <EmptyState label="お知らせはありません" />
              : <div style={{ display: "grid", gap: 8 }}>
                {announcements.map(a => (
                  <AnnouncementRow key={a.id} announcement={a} isUnread={unreadAnnouncementIds.has(a.id)}
                    formatDate={formatDate} onClick={() => handleAnnouncementClick(a)} />
                ))}
              </div>
          )}

          {activeTab === "announcements" && selectedAnnouncement && (
            <AnnouncementDetail announcement={selectedAnnouncement} formatDate={formatDate} onBack={() => setSelectedAnnouncement(null)} />
          )}

          {activeTab === "releases" && !(loading && releases.length === 0) && (
            releases.length === 0
              ? <EmptyState label="リリースノートはありません" />
              : <div style={{ display: "grid", gap: 28 }}>
                {releases.map((r, i) => <ReleaseSection key={r.id} release={r} isLatest={i === 0} formatDate={formatDate} />)}
              </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div style={{ textAlign: "center", padding: "48px 0", color: "var(--meta)", fontSize: 14 }}>{label}</div>;
}

function TypeBadge({ type }: { type: string }) {
  return <span className={cx("badge", TYPE_CLASS[type] ?? "badge-neutral")}>{type}</span>;
}

function CategoryBadge({ cat }: { cat: string }) {
  return <span className={cx("badge", CATEGORY_CLASS[cat] ?? "badge-neutral")}>{cat}</span>;
}

function AnnouncementRow({ announcement, isUnread, formatDate, onClick }: {
  announcement: Announcement; isUnread: boolean; formatDate: (s: string) => string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card card-interactive row"
      style={{ width: "100%", textAlign: "left", gap: 12, padding: "13px 14px", border: isUnread ? "1px solid var(--accent)" : undefined }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: isUnread ? "var(--danger)" : "transparent", marginTop: 2 }} />
      <div className="grow">
        <div className="row" style={{ gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
          <TypeBadge type={announcement.type} />
          <span className="text-meta">{formatDate(announcement.published_at)}</span>
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: isUnread ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {announcement.title}
        </p>
      </div>
      <span style={{ color: "var(--meta)", flexShrink: 0 }}>›</span>
    </button>
  );
}

function AnnouncementDetail({ announcement, formatDate, onBack }: {
  announcement: Announcement; formatDate: (s: string) => string; onBack: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 13, color: "var(--accent)", fontWeight: 600, padding: "0 0 16px" }}>
        ← 一覧に戻る
      </button>
      <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--surface)", marginBottom: 16 }}>
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <TypeBadge type={announcement.type} />
          <span className="text-meta">{formatDate(announcement.published_at)}</span>
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{announcement.title}</h2>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.85, color: "var(--fg-2)", whiteSpace: "pre-wrap" }}>{announcement.content}</p>
    </div>
  );
}

function ReleaseSection({ release, isLatest, formatDate }: {
  release: VersionRelease; isLatest: boolean; formatDate: (s: string) => string;
}) {
  const grouped = {
    新機能: release.items.filter(i => i.category === "新機能"),
    改善: release.items.filter(i => i.category === "改善"),
    修正: release.items.filter(i => i.category === "修正"),
  };

  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>v{release.version}</span>
        {isLatest && <span className="badge badge-accent">LATEST</span>}
        <span className="text-meta" style={{ marginLeft: "auto" }}>{formatDate(release.released_at)}</span>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{release.title}</p>
      {release.items.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          {(["新機能", "改善", "修正"] as const).map((cat, idx, arr) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            const isLast = arr.slice(idx + 1).every(c => grouped[c].length === 0);
            return (
              <div key={cat} style={{ padding: "12px 16px", borderBottom: isLast ? "none" : "1px solid var(--border-soft)" }}>
                <CategoryBadge cat={cat} />
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, listStyle: "disc" }}>
                  {items.map(item => (
                    <li key={item.id} style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.75 }}>{item.content}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
