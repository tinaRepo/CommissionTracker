"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── 型定義（CommissionApp・NotificationsModalの両方で共有） ──────────

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
  /** 未読（かつアカウント作成日以降に公開された）お知らせのID集合 */
  unreadAnnouncementIds: Set<string>;
  hasUnreadRelease: boolean;
  /** ヘッダーの🔔バッジに表示する合計未読数（お知らせ+リリースノート） */
  unreadCount: number;
  refetch: () => Promise<void>;
  markAnnouncementRead: (id: string) => Promise<void>;
  markReleasesRead: () => Promise<void>;
};

/**
 * お知らせ・リリースノートの取得と未読管理を1箇所に集約したフック。
 *
 * ■ 背景（重複クエリの解消）
 * 以前は「ヘッダーの未読バッジ用（CommissionApp.fetchUnreadCount）」と
 * 「お知らせモーダル用（NotificationsModal.fetchAll）」がほぼ同じデータを
 * それぞれ別々に取得しており、
 *   - モーダルを開くたびに実質同じクエリが二重に発行される
 *   - モーダルを開いてからデータが揃うまでの「表示の間」が発生する
 * という2つの問題があった。CommissionApp側でこのフックを1回だけ呼び出し、
 * 取得結果と既読化の関数をNotificationsModalへpropsとして渡すことで、
 * データの取得元を1つに統一している（NotificationsModal自体は
 * supabaseを直接呼ばない、純粋な表示コンポーネントになる）。管理者はRLSにより
 * 全件取得できるため、このhookでログインユーザーの配信対象に絞り込む。
 *
 * ■ アカウント作成日より前の告知の扱い（お知らせ・リリースノート共通）
 * announcements.published_at / version_releases.released_at が、
 * そのユーザーの user_profiles.created_at（アカウント作成日時）より
 * 前の場合、そのユーザーにとっては「登録前のサービス側の告知」であり
 * 新着とは言えないため、既読レコード（お知らせ側はuser_notification_status、
 * リリース側はuser_settings.last_seen_release_id）が無くても未読カウント・
 * 未読マーク（お知らせのリストの赤い丸／リリースノートタブのバッジ）の
 * 対象から除外し、既読として扱う。
 * ※ この既読扱いはクライアント側の表示上の判定のみで行い、DBへの書き込みは
 *   行わない（対象外というステータスをDBに保存する必要はなく、常に
 *   accountCreatedAtとの比較で導出できるため）。リリースノートは
 *   「最新の1件が既読かどうか」だけを管理する既存の設計（last_seen_release_id）
 *   をそのまま踏襲し、最新リリースの released_at がアカウント作成日より前なら
 *   常に既読（未読バッジなし）として扱う。
 *
 * ■ 未ログイン（デモモード）での扱い
 * `userId`が`null`の場合（ログインしていない・デモモードなど）、
 * RLSが許可する全員対象のお知らせ・version_releasesを取得して表示する。
 * ただし既読状態（user_notification_status・user_settings）は個人に
 * 紐づく情報のため取得せず、未読カウント・未読マークは常に「なし」
 * （既読扱い）として扱う。`markAnnouncementRead` / `markReleasesRead`も
 * `userId`がnullの間は何もしない（書き込み対象のユーザーが存在しないため）。
 *
 * @param userId 現在ログイン中のユーザーID（未ログイン・デモモード時はnull）
 * @param accountCreatedAt ユーザーのアカウント作成日時（user_profiles.created_at）。
 *   プロフィールの読み込みが完了する前など未取得の間はnullを渡す。
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

  // markAnnouncementRead / markReleasesRead から常に最新のuserIdを参照できるようにする
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const fetchAll = useCallback(async () => {
    const sequence = ++fetchSequence.current;
    setLoading(true);
    try {
      // announcementsはRLSで配信対象に制限される。管理者の全件取得分は
      // 下でログインユーザーの対象条件に再度絞り込む。
      // 既読ステータス（user_notification_status・user_settings）は
      // userIdが無いと個人を特定できないため、ログイン時のみ取得する。
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

  // マウント時・userIdが変わった時（未ログイン→ログインなど）に取得し直す
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 公開日と作成日の時刻部分は比較せず、日付が異なる場合だけ前後を判定する。
  // お知らせのpublished_atは日付入力から当日00:00で保存されるため、時刻比較すると
  // 同日に登録したユーザーがその日の新着お知らせまで既読扱いになってしまう。
  const isBeforeAccountCreation = (publishedAt: string) => {
    if (!accountCreatedAt) return false;
    const publishedDate = new Date(publishedAt).toISOString().slice(0, 10);
    const createdDate = new Date(accountCreatedAt).toISOString().slice(0, 10);
    return publishedDate < createdDate;
  };

  // 管理者はRLSで全お知らせを読めるため、ユーザー向け一覧では配信対象も適用する。
  const visibleAnnouncements = announcements.filter(announcement => {
    const hasUserTarget = !!announcement.target_user_ids?.length;
    const hasPlanTarget = !!announcement.target_plans?.length;
    if (!hasUserTarget && !hasPlanTarget) return true;

    const matchesUser = hasUserTarget && !!userId && announcement.target_user_ids!.includes(userId);
    const matchesPlan = hasPlanTarget && !!userPlan && announcement.target_plans!.includes(userPlan);
    return matchesUser || matchesPlan;
  });

  // NOTE: 未ログイン（userId===null、デモモード等）の場合は、そもそも
  // 「誰の既読状態か」を特定できないため、未読カウント・未読マークは
  // 常に「なし」（既読扱い）にする。お知らせ・リリースノートの内容自体は
  // 引き続き閲覧できる（読み取り専用ブラウジング）。
  const unreadAnnouncementIds = userId && statusUserId === userId
    ? new Set(
      visibleAnnouncements
        .filter(a => !readAnnouncementIds.has(a.id))
        .filter(a => !isBeforeAccountCreation(a.published_at))
        .map(a => a.id)
    )
    : new Set<string>();

  // リリースノートは「最新の1件が既読かどうか」のみを管理する設計のため、
  // 最新リリースのreleased_atがアカウント作成日より前なら、
  // last_seen_release_idの値に関わらず常に既読（未読バッジなし）として扱う。
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
