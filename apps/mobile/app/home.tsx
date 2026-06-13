import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useCommissions, useUnreadCount } from '../lib/packages/hooks';
import { fetchMyProfile } from '../lib/packages/supabase';
import { PLAN_LIMITS } from '../lib/packages/types';
import type { Commission, CommissionStatus, UserProfile, Plan } from '../lib/packages/types';

// ---- 定数 ----
const STATUSES: { key: CommissionStatus; label: string; color: string; bg: string }[] = [
  { key: 'pending', label: '依頼済み', color: '#f59e0b', bg: '#fef3c7' },
  { key: 'rough', label: 'ラフ確認中', color: '#8b5cf6', bg: '#ede9fe' },
  { key: 'progress', label: '制作中', color: '#3b82f6', bg: '#dbeafe' },
  { key: 'done', label: '完成', color: '#10b981', bg: '#d1fae5' },
  { key: 'cancelled', label: 'キャンセル', color: '#6b7280', bg: '#f3f4f6' },
];

function fmtDate(d?: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${y}/${m}/${day}`;
}

function daysUntil(d?: string) {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, day] = d.split('-').map(Number);
  const deadline = new Date(y, m - 1, day);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

// ---- ステータスバッジ ----
function StatusBadge({ status }: { status: CommissionStatus }) {
  const s = STATUSES.find(x => x.key === status) ?? STATUSES[0];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.color + '60' }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

// ---- 依頼カード ----
function CommissionCard({ item, onPress }: { item: Commission; onPress: () => void }) {
  const days = daysUntil(item.deadline);
  const urgent = days !== null && days <= 7 && item.status !== 'done' && item.status !== 'cancelled';

  return (
    <TouchableOpacity
      style={[styles.card, urgent && styles.cardUrgent]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.cardArtist}>🖌 {item.artist}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>📅 {fmtDate(item.ordered_at)}</Text>
        <Text style={styles.cardMeta}>⏰ {fmtDate(item.deadline)}</Text>
        {item.images && item.images.length > 0 && (
          <Text style={styles.cardMeta}>📷 {item.images.length}枚</Text>
        )}
        {urgent && days !== null && (
          <Text style={styles.urgentText}>⚠ あと{days}日</Text>
        )}
      </View>

      {item.price && (
        <Text style={styles.cardPrice}>¥{item.price.toLocaleString()}</Text>
      )}
    </TouchableOpacity>
  );
}

// ---- メイン画面 ----
export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | CommissionStatus>('all');

  const { commissions, loading, reload } = useCommissions(supabase);
  const { unreadCount, fetchUnreadCount } = useUnreadCount(supabase);

  // ---- 認証チェック ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/');
    });
  }, []);

  // ---- プロフィール取得 ----
  useEffect(() => {
    fetchMyProfile(supabase).then(setProfile);
  }, []);

  // ---- 未読件数 ----
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) fetchUnreadCount(user.id);
    });
  }, []);

  // ---- ログアウト ----
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  // ---- フィルタ ----
  const filtered = filterStatus === 'all'
    ? commissions
    : commissions.filter(c => c.status === filterStatus);

  const plan = (profile?.plan ?? 'free') as Plan;
  const planInfo = PLAN_LIMITS[plan];
  const imageCount = commissions.reduce((sum, c) => sum + (c.images?.length ?? 0), 0);

  // ---- 統計 ----
  const stats = {
    total: commissions.length,
    active: commissions.filter(c => c.status !== 'done' && c.status !== 'cancelled').length,
    done: commissions.filter(c => c.status === 'done').length,
  };

  return (
    <View style={styles.container}>

      {/* ── ヘッダー ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🎨 Commission Tracker</Text>
          <Text style={styles.headerSub}>絵の依頼管理ツール</Text>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <View style={styles.bellWrap}>
              <Text style={styles.bellIcon}>🔔</Text>
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 統計 ── */}
      <View style={styles.statsRow}>
        {[['合計', stats.total], ['進行中', stats.active], ['完成', stats.done]].map(([l, v]) => (
          <View key={l as string} style={styles.statItem}>
            <Text style={styles.statValue}>{v}</Text>
            <Text style={styles.statLabel}>{l}</Text>
          </View>
        ))}
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { fontSize: 13 }]}>
            {planInfo.imageLimit === null ? `${imageCount}枚` : `${imageCount}/${planInfo.imageLimit}`}
          </Text>
          <Text style={styles.statLabel}>📷 画像</Text>
        </View>
      </View>

      {/* ── フィルタ ── */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ key: 'all', label: 'すべて', color: '#1a0a2e', bg: '#fff' }, ...STATUSES]}
          keyExtractor={item => item.key}
          renderItem={({ item }) => {
            const active = filterStatus === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  active && { backgroundColor: item.color, borderColor: item.color }
                ]}
                onPress={() => setFilterStatus(item.key as any)}
              >
                <Text style={[styles.filterChipText, active && { color: '#fff' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        />
      </View>

      {/* ── 依頼一覧 ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7c3aed" size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CommissionCard
              item={item}
              onPress={() => router.push(`/commission/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={reload} tintColor="#7c3aed" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>依頼がありません</Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { padding: 16, gap: 12 }}
        />
      )}

      {/* ── 新規登録ボタン ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/commission/new')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#1a0a2e', padding: 16, paddingTop: 48,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#a78bfa', fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellWrap: { position: 'relative' },
  bellIcon: { fontSize: 22 },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: '#ffffff18', borderWidth: 1, borderColor: '#ffffff30',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow: {
    backgroundColor: '#2d1a4a', flexDirection: 'row',
    paddingVertical: 12, paddingHorizontal: 16, gap: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#a78bfa', fontSize: 10, marginTop: 2 },
  filterWrap: { paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  cardUrgent: { borderColor: '#fca5a5' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a0a2e', flex: 1, marginRight: 8 },
  cardArtist: { fontSize: 13, color: '#555', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardMeta: { fontSize: 12, color: '#888' },
  urgentText: { fontSize: 12, color: '#ef4444', fontWeight: 'bold' },
  cardPrice: { fontSize: 16, fontWeight: 'bold', color: '#1a0a2e', marginTop: 8, textAlign: 'right' },
  badge: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  emptyText: { color: '#aaa', fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: 'bold', lineHeight: 32 },
});
