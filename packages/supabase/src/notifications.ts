import type { SupabaseClient } from './client';
import type {
    Announcement,
    VersionRelease,
    VersionReleaseItem,
} from '@commission-tracker/types';

// ─── お知らせ ──────────────────────────────────────────────────

export async function fetchAnnouncements(
    supabase: SupabaseClient
): Promise<Announcement[]> {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function fetchUnreadAnnouncementIds(
    supabase: SupabaseClient,
    userId: string,
    announcementIds: string[]
): Promise<Set<string>> {
    if (announcementIds.length === 0) return new Set();
    const { data, error } = await supabase
        .from('user_notification_status')
        .select('announcement_id, is_read')
        .eq('user_id', userId);
    if (error) throw error;
    const readIds = new Set(
        (data ?? []).filter((s) => s.is_read).map((s) => s.announcement_id)
    );
    return new Set(announcementIds.filter((id) => !readIds.has(id)));
}

export async function markAnnouncementRead(
    supabase: SupabaseClient,
    userId: string,
    announcementId: string
): Promise<void> {
    const { error } = await supabase.from('user_notification_status').upsert(
        { user_id: userId, announcement_id: announcementId, is_read: true },
        { onConflict: 'user_id,announcement_id' }
    );
    if (error) throw error;
}

// ─── リリースノート ────────────────────────────────────────────

export async function fetchReleases(
    supabase: SupabaseClient
): Promise<(VersionRelease & { items: VersionReleaseItem[] })[]> {
    const { data, error } = await supabase
        .from('version_releases')
        .select('*, version_release_items(*)')
        .order('released_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
        ...r,
        items: (r.version_release_items ?? []).sort(
            (a: VersionReleaseItem, b: VersionReleaseItem) =>
                a.sort_order - b.sort_order
        ),
    }));
}

export async function fetchLastSeenReleaseId(
    supabase: SupabaseClient,
    userId: string
): Promise<string | null> {
    const { data, error } = await supabase
        .from('user_settings')
        .select('last_seen_release_id')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data?.last_seen_release_id ?? null;
}

export async function markReleasesRead(
    supabase: SupabaseClient,
    userId: string,
    latestReleaseId: string
): Promise<void> {
    const { error } = await supabase.from('user_settings').upsert(
        { user_id: userId, last_seen_release_id: latestReleaseId },
        { onConflict: 'user_id' }
    );
    if (error) throw error;
}

// ─── モバイルプッシュ通知トークン ──────────────────────────────
// Web版の push_subscriptions（Web Push）とは別テーブル（mobile_push_tokens）を使用。

export async function registerMobilePushToken(
    supabase: SupabaseClient,
    expoPushToken: string,
    platform: 'ios' | 'android',
    deviceId: string | null
): Promise<void> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('mobile_push_tokens').upsert(
        {
            user_id: user.id,
            expo_push_token: expoPushToken,
            platform,
            device_id: deviceId,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,expo_push_token' }
    );
    if (error) throw error;
}

export async function unregisterMobilePushToken(
    supabase: SupabaseClient,
    expoPushToken: string
): Promise<void> {
    const { error } = await supabase
        .from('mobile_push_tokens')
        .delete()
        .eq('expo_push_token', expoPushToken);
    if (error) throw error;
}
