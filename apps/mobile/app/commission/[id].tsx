import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { fetchCommissionById, deleteCommission } from '../../lib/packages/supabase/commissions';
import { fetchMyProfile } from '../../lib/packages/supabase/user';
import type { Commission, CommissionStatus, Plan } from '../../lib/packages/types/index';
import ImageSection from '../../components/ImageSection';

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

function StatusBadge({ status }: { status: CommissionStatus }) {
  const s = STATUSES.find(x => x.key === status) ?? STATUSES[0];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.color + '60' }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function CommissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [commission, setCommission] = useState<Commission | null>(null);
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCommissionById(supabase, id)
      .then(setCommission)
      .catch(() => setCommission(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchMyProfile(supabase).then(p => {
      if (p) setPlan(p.plan as Plan);
    });
  }, []);

  async function handleDelete() {
    Alert.alert(
      '依頼を削除',
      '本当に削除しますか？この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deleteCommission(supabase, id);
              router.replace('/home');
            } catch {
              Alert.alert('エラー', '削除に失敗しました');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  if (!commission) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>依頼が見つかりませんでした</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/home')}>
          <Text style={styles.backButtonText}>一覧に戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const days = daysUntil(commission.deadline);
  const urgent = days !== null && days <= 7
    && commission.status !== 'done'
    && commission.status !== 'cancelled';

  return (
    <View style={styles.container}>

      {/* ── ヘッダー ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{commission.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* タイトル・ステータス */}
        <View style={styles.titleArea}>
          <Text style={styles.title}>{commission.title}</Text>
          <View style={styles.titleRow}>
            <StatusBadge status={commission.status} />
            {urgent && days !== null && (
              <Text style={styles.urgentText}>⚠ あと{days}日</Text>
            )}
          </View>
        </View>

        {/* 詳細情報 */}
        <View style={styles.infoCard}>
          <InfoRow label="絵師名" value={commission.artist} />
          {commission.x_id && (
            <InfoRow label="X ID" value={commission.x_id} />
          )}
          <InfoRow label="依頼日" value={fmtDate(commission.ordered_at)} />
          <InfoRow label="納期" value={fmtDate(commission.deadline)} />
          {commission.rough_date && (
            <InfoRow label="ラフ提出日" value={fmtDate(commission.rough_date)} />
          )}
          <InfoRow
            label="金額"
            value={commission.price ? `¥${commission.price.toLocaleString()}` : '—'}
          />
          {commission.notes && (
            <View style={styles.notesArea}>
              <Text style={styles.infoLabel}>メモ</Text>
              <Text style={styles.notesText}>{commission.notes}</Text>
            </View>
          )}
        </View>

        {/* 画像：表示のみ（追加・削除・プレビュー不可） */}
        <View style={styles.imageArea}>
          <ImageSection
            commission={commission}
            plan={plan}
            onUpdated={() => { }}
            readonly
          />
        </View>

      </ScrollView>

      {/* ── ボタンエリア ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/commission/edit/${id}`)}
        >
          <Text style={styles.editButtonText}>編集</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator color="#ef4444" />
            : <Text style={styles.deleteButtonText}>削除</Text>
          }
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#1a0a2e', paddingTop: 48, paddingBottom: 16,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerBack: {
    backgroundColor: '#ffffff18', borderWidth: 1, borderColor: '#ffffff30',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  headerBackText: { color: '#c4b5fd', fontSize: 12, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  titleArea: { gap: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a0a2e' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentText: { fontSize: 12, color: '#ef4444', fontWeight: 'bold' },
  badge: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, gap: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: { width: 100, fontSize: 13, color: '#888', fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: '#1a0a2e' },
  notesArea: { gap: 6 },
  notesText: { fontSize: 13, color: '#1a0a2e', lineHeight: 20 },
  imageArea: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  errorText: { color: '#aaa', fontSize: 15, marginBottom: 16 },
  backButton: {
    backgroundColor: '#7c3aed', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backButtonText: { color: '#fff', fontWeight: 'bold' },
  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff',
  },
  editButton: {
    flex: 1, backgroundColor: '#7c3aed', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  editButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  deleteButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fca5a5',
  },
  deleteButtonText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 },
});
