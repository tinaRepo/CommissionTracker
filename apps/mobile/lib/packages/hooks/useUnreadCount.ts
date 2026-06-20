import { useState, useCallback } from 'react';
import type { SupabaseClient } from '../supabase/index';

export interface UseUnreadCountReturn {
    unreadCount: number;
    fetchUnreadCount: (userId: string) => Promise<void>;
}

export function useUnreadCount(supabase: SupabaseClient): UseUnreadCountReturn {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = useCallback(async (userId: string) => {
        // 未読お知らせ数
        const { data: announcements } = await supabase
            .from('announcements')
            .select('id');

        const { data: readStatuses } = await supabase
            .from('user_notification_status')
            .select('announcement_id')
            .eq('user_id', userId)
            .eq('is_read', true);

        const readIds = new Set(readStatuses?.map(r => r.announcement_id) ?? []);
        const unreadAnnouncements = (announcements ?? []).filter(a => !readIds.has(a.id)).length;

        // 未読バージョン数
        const { data: settings } = await supabase
            .from('user_settings')
            .select('last_seen_release_id')
            .eq('user_id', userId)
            .single();

        let unreadVersions = 0;
        if (settings?.last_seen_release_id) {
            const { count } = await supabase
                .from('version_releases')
                .select('id', { count: 'exact', head: true })
                .gt('created_at', (
                    await supabase
                        .from('version_releases')
                        .select('created_at')
                        .eq('id', settings.last_seen_release_id)
                        .single()
                ).data?.created_at ?? '');
            unreadVersions = count ?? 0;
        } else {
            const { count } = await supabase
                .from('version_releases')
                .select('id', { count: 'exact', head: true });
            unreadVersions = count ?? 0;
        }

        setUnreadCount(unreadAnnouncements + unreadVersions);
    }, [supabase]);

    return { unreadCount, fetchUnreadCount };
}