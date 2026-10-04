"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── 型定義（TaskApp・NotificationsModalの両方で共有） ──────────

export type AnnouncementType = "お知らせ" | "メンテナンス" | "障害情報" | "キャンペーン";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  published_at: string;
  target_plans?: string[] | null;
  target_user_ids?: string[] | null;
};

export type VersionReleaseItem = {
  id: string;
  category: "新機能" | "改善" | "修正";
  content: string;
  sort_order: number;
};

export type VersionRelease = {
  id: string;
  version: string;
  title: string;
  released_at: string;
  items: VersionReleaseItem[];
};

export type UseNotificationsResult = {
  loading: boolean;
  announcements: Announcement[];
  releases: VersionRelease[];
  unreadAnnouncementIds: Set<string>;
  hasUnreadRelease: boolean;
  unreadCount: number;
  refetch: () => Promise<void>;
  markAnnouncementRead: (id: string) => Promise<void>;
  markReleasesRead: () => Promise<void>;
};

/**
 * お知らせ・リリースノートの取得と未読管理を1箇所に集約したフック。
 * ヘッダーの未読バッジ・NotificationsModal・DemoAppの3箇所が利用する。
 */
export function useNotifications(
  userId: string | null,
  accountCreatedAt: string | null,
  userPlan: string | null = null
): UseNotificationsResult {
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [releases, setReleases] = useState<VersionRelease[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [lastSeenReleaseId, setLastSeenReleaseId] = useState<string | null>(null);
  const [statusUserId, setStatusUserId] = useState<string | null | undefined>(undefined);
  const fetchSequence = useRef(0);

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const fetchAll = useCallback(async () => {
    const sequence = ++fetchSequence.current;
    setLoading(true);
    try {
      const [
        { data: announcementData, error: announcementError },
        { data: statusData, error: statusError },
        { data: releaseData, error: releaseError },
        { data: settingsData, error: settingsError },
      ] = await Promise.all([
        supabase
          .from("announcements")
          .select("id, title, content, type, published_at, target_plans, target_user_ids")
          .order("published_at", { ascending: false }),
        userId
          ? supabase
            .from("user_notification_status")
            .select("announcement_id")
            .eq("user_id", userId)
            .eq("is_read", true)
          : Promise.resolve({ data: [] as { announcement_id: string }[], error: null }),
        supabase
          .from("version_releases")
          .select("*, version_release_items(*)")
          .order("released_at", { ascending: false }),
        userId
          ? supabase
            .from("user_settings")
            .select("last_seen_release_id")
            .eq("user_id", userId)
            .maybeSingle()
          : Promise.resolve({ data: null as { last_seen_release_id: string | null } | null, error: null }),
      ]);

      if (sequence !== fetchSequence.current) return;
      const fetchError = announcementError ?? statusError ?? releaseError ?? settingsError;
      if (fetchError) throw fetchError;

      setAnnouncements(announcementData ?? []);
      setReadAnnouncementIds(new Set((statusData ?? []).map((s: any) => s.announcement_id)));
      setStatusUserId(userId);

      const formattedReleases: VersionRelease[] = (releaseData ?? []).map((r: any) => ({
        ...r,
        items: (r.version_release_items ?? []).sort(
          (a: VersionReleaseItem, b: VersionReleaseItem) => a.sort_order - b.sort_order
        ),
      }));
      setReleases(formattedReleases);
      setLastSeenReleaseId(settingsData?.last_seen_release_id ?? null);
    } catch (error) {
      if (sequence === fetchSequence.current) {
        console.error("notifications fetch error:", error);
      }
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isBeforeAccountCreation = (publishedAt: string) => {
    if (!accountCreatedAt) return false;
    const publishedDate = new Date(publishedAt).toISOString().slice(0, 10);
    const createdDate = new Date(accountCreatedAt).toISOString().slice(0, 10);
    return publishedDate < createdDate;
  };

  const visibleAnnouncements = announcements.filter(announcement => {
    const hasUserTarget = !!announcement.target_user_ids?.length;
    const hasPlanTarget = !!announcement.target_plans?.length;
    if (!hasUserTarget && !hasPlanTarget) return true;

    const matchesUser = hasUserTarget && !!userId && announcement.target_user_ids!.includes(userId);
    const matchesPlan = hasPlanTarget && !!userPlan && announcement.target_plans!.includes(userPlan);
    return matchesUser || matchesPlan;
  });

  const unreadAnnouncementIds = userId && statusUserId === userId
    ? new Set(
      visibleAnnouncements
        .filter(a => !readAnnouncementIds.has(a.id))
        .filter(a => !isBeforeAccountCreation(a.published_at))
        .map(a => a.id)
    )
    : new Set<string>();

  const latestRelease = releases[0] ?? null;
  const hasUnreadRelease =
    !!userId &&
    statusUserId === userId &&
    !!latestRelease &&
    !isBeforeAccountCreation(latestRelease.released_at) &&
    lastSeenReleaseId !== latestRelease.id;

  const unreadCount = unreadAnnouncementIds.size + (hasUnreadRelease ? 1 : 0);

  const markAnnouncementRead = useCallback(async (id: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { error } = await supabase.from("user_notification_status").upsert(
      { user_id: uid, announcement_id: id, is_read: true },
      { onConflict: "user_id,announcement_id" }
    );
    if (error) throw error;
    setReadAnnouncementIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markReleasesRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || releases.length === 0) return;
    const latestId = releases[0].id;
    await supabase.from("user_settings").upsert(
      { user_id: uid, last_seen_release_id: latestId },
      { onConflict: "user_id" }
    );
    setLastSeenReleaseId(latestId);
  }, [releases]);

  return {
    loading,
    announcements: visibleAnnouncements,
    releases,
    unreadAnnouncementIds,
    hasUnreadRelease,
    unreadCount,
    refetch: fetchAll,
    markAnnouncementRead,
    markReleasesRead,
  };
}
