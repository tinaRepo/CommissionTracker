import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, ActivityIndicator, Animated, Dimensions, Image,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { fetchCommissionById, deleteCommission, fetchMyProfile } from '@commission-tracker/supabase';
import type { Commission, CommissionStatus, UserProfile, Plan } from '@commission-tracker/types';
import ImageSection from './ImageSection';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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

type Props = {
  commissionId: string | null;
  onClose: () => void;
  onUpdated: () => void;
};

export default function CommissionDetailModal({ commissionId, onClose, onUpdated }: Props) {
  const [commission, setCommission] = useState<Commission | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<{ url: string; fileName: string } | null>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const visible = !!commissionId;

  // ---- アニメーション ----
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // ---- データ取得 ----
  useEffect(() => {
    if (!commissionId) {
      setCommission(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchCommissionById(supabase, commissionId),
      fetchMyProfile(supabase),
    ]).then(([c, p]) => {
      setCommission(c);
      setProfile(p);
    }).finally(() => setLoading(false));
  }, [commissionId]);

  // ---- 更新時にデータ再取得 ----
  async function handleUpdated() {
    if (!commissionId) return;
    const c = await fetchCommissionById(supabase, commissionId);
    setCommission(c);
    onUpdated();
  }

  // ---- DL ----
  async function handleDownload(url: string, fileName: string) {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限エラー', 'ギャラリーへの保存権限を許可してください');
        return;
      }
      const downloadDest = `${FileSystem.cacheDirectory}${fileName}`;
      const { uri } = await FileSystem.downloadAsync(url, downloadDest);
      await MediaLibrary.saveToLibraryAsync(uri);
      await FileSystem.deleteAsync(uri, { idempotent: true });
      Alert.alert('保存完了', 'ギャラリーに保存しました');
    } catch (err: any) {
      Alert.alert('エラー', `ダウンロードに失敗しました\n${err.message ?? ''}`);
    }
  }

  // ---- 削除 ----
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
            if (!commissionId) return;
            setDeleting(true);
            try {
              await deleteCommission(supabase, commissionId);
              onClose();
              onUpdated();
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

  const plan = (profile?.plan ?? 'free') as Plan;

  return (
    <>
      {/* ── メインモーダル ── */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[styles.modal, { transform: [{ translateY: slideAnim }] }]}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalInner}>

              <View style={styles.handle} />

              {loading || !commission ? (
                <View style={styles.center}>
                  <ActivityIndicator color="#7c3aed" size="large" />
                </View>
              ) : (
                <>
                  {/* ── ヘッダー（固定） ── */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderLeft}>
                      <Text style={styles.modalTitle} numberOfLines={2}>
                        {commission.title}
                      </Text>
                      <View style={styles.modalHeaderBadges}>
                        <StatusBadge status={commission.status} />
                        {(() => {
                          const days = daysUntil(commission.deadline);
                          const urgent = days !== null && days <= 7
                            && commission.status !== 'done'
                            && commission.status !== 'cancelled';
                          return urgent && days !== null ? (
                            <Text style={styles.urgentText}>⚠ あと{days}日</Text>
                          ) : null;
                        })()}
                      </View>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── コンテンツ（スクロール） ── */}
                  <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                  >
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
                        <View>
                          <Text style={styles.infoLabel}>メモ</Text>
                          <Text style={styles.notesText}>{commission.notes}</Text>
                        </View>
                      )}
                    </View>

                    {/* 画像：プレビュー・DL可能、追加・削除不可 */}
                    <View style={styles.imageArea}>
                      <ImageSection
                        commission={commission}
                        plan={plan}
                        onUpdated={handleUpdated}
                        readonly
                        showDownload
                        onPreview={(url, fileName) => setPreview({ url, fileName })}
                      />
                    </View>
                  </ScrollView>

                  {/* ── フッターボタン（固定） ── */}
                  <View style={styles.footer}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        onClose();
                        router.push(`/commission/edit/${commissionId}`);
                      }}
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
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* ── プレビューModal（メインModalの外側） ── */}
      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <TouchableOpacity
          style={styles.previewOverlay}
          onPress={() => setPreview(null)}
          activeOpacity={1}
        >
          {preview && (
            <>
              <Image
                source={{ uri: preview.url }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.previewDownloadButton}
                onPress={() => handleDownload(preview.url, preview.fileName)}
              >
                <Text style={styles.previewDownloadText}>⬇ ダウンロード</Text>
              </TouchableOpacity>
              <Text style={styles.previewClose}>✕ 閉じる</Text>
            </>
          )}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.85, overflow: 'hidden',
  },
  modalInner: { flex: 1 },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexShrink: 0,
  },
  modalHeaderLeft: { flex: 1, gap: 8, marginRight: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a0a2e' },
  modalHeaderBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  urgentText: { fontSize: 12, color: '#ef4444', fontWeight: 'bold' },
  closeButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  closeButtonText: { color: '#888', fontSize: 16 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 32 },
  infoCard: {
    backgroundColor: '#faf8f5', borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: { width: 100, fontSize: 13, color: '#888', fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: '#1a0a2e' },
  notesText: { fontSize: 13, color: '#1a0a2e', lineHeight: 20, marginTop: 4 },
  imageArea: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  badge: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    backgroundColor: '#fff', flexShrink: 0,
  },
  editButton: {
    flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  editButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  deleteButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fca5a5',
  },
  deleteButtonText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 },
  // プレビュー
  previewOverlay: {
    flex: 1, backgroundColor: '#000a', alignItems: 'center', justifyContent: 'center',
  },
  previewImage: { width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32 },
  previewDownloadButton: {
    marginTop: 16, backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  previewDownloadText: { color: '#1a0a2e', fontWeight: 'bold', fontSize: 14 },
  previewClose: { color: '#fff', marginTop: 12, fontSize: 14, fontWeight: 'bold' },
});
