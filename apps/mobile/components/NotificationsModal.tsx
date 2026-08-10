import { useState, useEffect, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
    fetchAnnouncements,
    fetchUnreadAnnouncementIds,
    markAnnouncementRead,
    fetchReleases,
    fetchLastSeenReleaseId,
    markReleasesRead,
} from '@commission-tracker/supabase';
import type {
    Announcement,
    VersionRelease,
    VersionReleaseItem,
} from '@commission-tracker/types';

type Tab = 'announcements' | 'releases';
type ReleaseWithItems = VersionRelease & { items: VersionReleaseItem[] };

const TYPE_COLORS: Record<Announcement['type'], { bg: string; color: string }> = {
    お知らせ: { bg: '#dbeafe', color: '#1d4ed8' },
    メンテナンス: { bg: '#fef3c7', color: '#b45309' },
    障害情報: { bg: '#fee2e2', color: '#b91c1c' },
    キャンペーン: { bg: '#d1fae5', color: '#065f46' },
};

type Props = {
    visible: boolean;
    onClose: () => void;
    /** 閉じた後に親側の未読カウントを再取得するコールバック */
    onRead?: () => void;
};

// 注意: このModalはホーム画面（home.tsx）などの「兄弟要素」として配置すること。
// 他のModal（例: CommissionDetailModal）の内側にネストするとAndroidで
// `addViewAt: failed to insert view` エラーが発生するため（handover.md参照）。
export default function NotificationsModal({ visible, onClose, onRead }: Props) {
    const [tab, setTab] = useState<Tab>('announcements');
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [releases, setReleases] = useState<ReleaseWithItems[]>([]);
    const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
    const [hasUnreadRelease, setHasUnreadRelease] = useState(false);
    const [selected, setSelected] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            const uid = user?.id ?? null;
            setUserId(uid);

            const [a, r] = await Promise.all([
                fetchAnnouncements(supabase),
                fetchReleases(supabase),
            ]);
            setAnnouncements(a);
            setReleases(r);

            if (uid) {
                const unread = await fetchUnreadAnnouncementIds(
                    supabase,
                    uid,
                    a.map((x) => x.id)
                );
                setUnreadIds(unread);
                if (r.length > 0) {
                    const lastSeenId = await fetchLastSeenReleaseId(supabase, uid);
                    setHasUnreadRelease(lastSeenId !== r[0].id);
                }
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            setTab('announcements');
            setSelected(null);
            loadAll();
        }
    }, [visible, loadAll]);

    function handleClose() {
        onClose();
        onRead?.();
    }

    async function handleTabChange(next: Tab) {
        setTab(next);
        setSelected(null);
        if (next === 'releases' && hasUnreadRelease && userId && releases.length > 0) {
            await markReleasesRead(supabase, userId, releases[0].id);
            setHasUnreadRelease(false);
        }
    }

    async function handleAnnouncementPress(a: Announcement) {
        setSelected(a);
        if (userId && unreadIds.has(a.id)) {
            await markAnnouncementRead(supabase, userId, a.id);
            setUnreadIds((prev) => {
                const n = new Set(prev);
                n.delete(a.id);
                return n;
            });
        }
    }

    function formatDate(s: string) {
        return new Date(s).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>お知らせ</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Text style={{ fontSize: 18, color: '#888' }}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabBar}>
                        <TabButton
                            label="お知らせ"
                            active={tab === 'announcements'}
                            badge={unreadIds.size}
                            onPress={() => handleTabChange('announcements')}
                        />
                        <TabButton
                            label="リリースノート"
                            active={tab === 'releases'}
                            badge={hasUnreadRelease ? 1 : 0}
                            onPress={() => handleTabChange('releases')}
                        />
                    </View>

                    <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
                        {loading && (
                            <ActivityIndicator color="#7c3aed" style={{ marginTop: 40 }} />
                        )}

                        {!loading && tab === 'announcements' && !selected && (
                            announcements.length === 0 ? (
                                <Text style={styles.empty}>お知らせはありません</Text>
                            ) : (
                                announcements.map((a) => (
                                    <AnnouncementRow
                                        key={a.id}
                                        a={a}
                                        unread={unreadIds.has(a.id)}
                                        formatDate={formatDate}
                                        onPress={() => handleAnnouncementPress(a)}
                                    />
                                ))
                            )
                        )}

                        {!loading && tab === 'announcements' && selected && (
                            <AnnouncementDetail
                                a={selected}
                                formatDate={formatDate}
                                onBack={() => setSelected(null)}
                            />
                        )}

                        {!loading && tab === 'releases' && (
                            releases.length === 0 ? (
                                <Text style={styles.empty}>リリースノートはありません</Text>
                            ) : (
                                releases.map((r, i) => (
                                    <ReleaseRow
                                        key={r.id}
                                        release={r}
                                        isLatest={i === 0}
                                        formatDate={formatDate}
                                    />
                                ))
                            )
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function TabButton({
    label, active, badge, onPress,
}: { label: string; active: boolean; badge: number; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.tabBtn, active && styles.tabBtnActive]}
            onPress={onPress}
        >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            {badge > 0 && <View style={styles.dot} />}
        </TouchableOpacity>
    );
}

function AnnouncementRow({
    a, unread, formatDate, onPress,
}: {
    a: Announcement;
    unread: boolean;
    formatDate: (s: string) => string;
    onPress: () => void;
}) {
    const c = TYPE_COLORS[a.type];
    return (
        <TouchableOpacity style={[styles.card, unread && styles.cardUnread]} onPress={onPress}>
            <View style={[styles.unreadDot, { backgroundColor: unread ? '#ef4444' : 'transparent' }]} />
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <View style={[styles.badge, { backgroundColor: c.bg }]}>
                        <Text style={[styles.badgeText, { color: c.color }]}>{a.type}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(a.published_at)}</Text>
                </View>
                <Text style={[styles.cardTitle, unread && { fontWeight: '700' }]} numberOfLines={1}>
                    {a.title}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

function AnnouncementDetail({
    a, formatDate, onBack,
}: { a: Announcement; formatDate: (s: string) => string; onBack: () => void }) {
    const c = TYPE_COLORS[a.type];
    return (
        <View>
            <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
                <Text style={{ color: '#7c3aed', fontWeight: '600' }}>← 一覧に戻る</Text>
            </TouchableOpacity>
            <View style={[styles.detailHeader, { backgroundColor: c.bg }]}>
                <View style={[styles.badge, { backgroundColor: '#fff' }]}>
                    <Text style={[styles.badgeText, { color: c.color }]}>{a.type}</Text>
                </View>
                <Text style={styles.detailTitle}>{a.title}</Text>
                <Text style={styles.dateText}>{formatDate(a.published_at)}</Text>
            </View>
            <Text style={styles.detailContent}>{a.content}</Text>
        </View>
    );
}

function ReleaseRow({
    release, isLatest, formatDate,
}: { release: ReleaseWithItems; isLatest: boolean; formatDate: (s: string) => string }) {
    return (
        <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text style={styles.versionText}>v{release.version}</Text>
                {isLatest && (
                    <View style={styles.latestBadge}>
                        <Text style={styles.latestText}>LATEST</Text>
                    </View>
                )}
                <Text style={[styles.dateText, { marginLeft: 'auto' }]}>
                    {formatDate(release.released_at)}
                </Text>
            </View>
            <Text style={styles.releaseTitle}>{release.title}</Text>
            {release.items.map((item) => (
                <Text key={item.id} style={styles.releaseItem}>・{item.content}</Text>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { fontSize: 18, fontWeight: '800', color: '#1a0a2e' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
    tabBar: { flexDirection: 'row', gap: 4, marginHorizontal: 20, backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4 },
    tabBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#fff' },
    tabLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
    tabLabelActive: { color: '#1a0a2e', fontWeight: '700' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
    body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    empty: { textAlign: 'center', color: '#bbb', marginTop: 40 },
    card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6', marginBottom: 8 },
    cardUnread: { borderColor: '#c4b5fd' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    dateText: { fontSize: 11, color: '#bbb' },
    cardTitle: { fontSize: 14, color: '#1a0a2e' },
    detailHeader: { padding: 16, borderRadius: 14, marginBottom: 16, gap: 8 },
    detailTitle: { fontSize: 17, fontWeight: '800', color: '#1a0a2e' },
    detailContent: { fontSize: 14, lineHeight: 22, color: '#444' },
    versionText: { fontSize: 16, fontWeight: '800', color: '#1a0a2e' },
    latestBadge: { backgroundColor: '#7c3aed', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    latestText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    releaseTitle: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8 },
    releaseItem: { fontSize: 13, color: '#333', lineHeight: 20, marginBottom: 4 },
});
