import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { fetchCommissionById, updateCommission } from '../../../lib/packages/supabase/commissions';
import { deleteImage } from '../../../lib/packages/supabase/images';
import { fetchMyProfile } from '../../../lib/packages/supabase/user';
import type { Commission, CommissionStatus, CommissionImage, Plan } from '../../../lib/packages/types/index';
import DatePickerField from '../../../components/DatePickerField';
import ImageSection from '../../../components/ImageSection';

// ---- 定数 ----
const STATUSES: { key: CommissionStatus; label: string }[] = [
  { key: 'pending', label: '依頼済み' },
  { key: 'rough', label: 'ラフ確認中' },
  { key: 'progress', label: '制作中' },
  { key: 'done', label: '完成' },
  { key: 'cancelled', label: 'キャンセル' },
];

type FormValues = {
  title: string;
  artist: string;
  x_id: string;
  ordered_at: string;
  deadline: string;
  rough_date: string;
  price: string;
  currency: string;
  status: CommissionStatus;
  notes: string;
};

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function EditCommissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [commission, setCommission] = useState<Commission | null>(null);
  const [form, setForm] = useState<FormValues | null>(null);
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImageDeletes, setPendingImageDeletes] = useState<CommissionImage[]>([]);

  // ---- 既存データ取得 ----
  useEffect(() => {
    if (!id) return;
    fetchCommissionById(supabase, id)
      .then((c: Commission | null) => {
        if (!c) return;
        setCommission(c);
        setForm({
          title: c.title,
          artist: c.artist,
          x_id: c.x_id ?? '',
          ordered_at: c.ordered_at ?? '',
          deadline: c.deadline ?? '',
          rough_date: c.rough_date ?? '',
          price: c.price?.toString() ?? '',
          currency: c.currency,
          status: c.status,
          notes: c.notes ?? '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ---- プロフィール取得 ----
  useEffect(() => {
    fetchMyProfile(supabase).then(p => {
      if (p) setPlan(p.plan as Plan);
    });
  }, []);

  function update(key: keyof FormValues, value: string) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleSave() {
    if (!form || !id) return;
    if (!form.title.trim() || !form.artist.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateCommission(supabase, id, {
        title: form.title.trim(),
        artist: form.artist.trim(),
        x_id: form.x_id.trim() || undefined,
        ordered_at: form.ordered_at || undefined,
        deadline: form.deadline || undefined,
        rough_date: form.rough_date || undefined,
        price: form.price ? Number(form.price.replace(/,/g, '')) : undefined,
        currency: form.currency,
        status: form.status,
        notes: form.notes.trim() || undefined,
      });

      // 削除予定の画像をDB削除
      for (const img of pendingImageDeletes) {
        try { await deleteImage(supabase, img); } catch { }
      }
      setPendingImageDeletes([]);

      router.replace(`/commission/${id}`);
    } catch {
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  if (!form || !commission) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>データが見つかりませんでした</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/home')}>
          <Text style={styles.backButtonText}>一覧に戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isValid = form.title.trim() && form.artist.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── ヘッダー ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace(`/commission/${id}`)}
          style={styles.headerBack}
        >
          <Text style={styles.headerBackText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>依頼を編集</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>⚠ {error}</Text>
          </View>
        )}

        <Field label="件名" required>
          <TextInput
            style={styles.input}
            placeholder="例: アイコン用イラスト"
            placeholderTextColor="#aaa"
            value={form.title}
            onChangeText={v => update('title', v)}
          />
        </Field>

        <Field label="絵師名" required>
          <TextInput
            style={styles.input}
            placeholder="例: 花咲りん"
            placeholderTextColor="#aaa"
            value={form.artist}
            onChangeText={v => update('artist', v)}
          />
        </Field>

        <Field label="X ID（任意）">
          <TextInput
            style={styles.input}
            placeholder="例: @artist_name"
            placeholderTextColor="#aaa"
            value={form.x_id}
            onChangeText={v => update('x_id', v)}
            autoCapitalize="none"
          />
        </Field>

        <DatePickerField
          label="依頼日"
          value={form.ordered_at}
          onChange={v => update('ordered_at', v)}
        />

        <DatePickerField
          label="納期"
          value={form.deadline}
          onChange={v => update('deadline', v)}
        />

        <DatePickerField
          label="ラフ提出日（任意）"
          value={form.rough_date}
          onChange={v => update('rough_date', v)}
        />

        <Field label="金額（円）">
          <TextInput
            style={styles.input}
            placeholder="例: 5000"
            placeholderTextColor="#aaa"
            value={form.price}
            onChangeText={v => update('price', v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
          />
        </Field>

        <Field label="ステータス">
          <View style={styles.statusGrid}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.statusChip,
                  form.status === s.key && styles.statusChipActive,
                ]}
                onPress={() => update('status', s.key)}
              >
                <Text style={[
                  styles.statusChipText,
                  form.status === s.key && styles.statusChipTextActive,
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="メモ（任意）">
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="色味の指定や注意点など"
            placeholderTextColor="#aaa"
            value={form.notes}
            onChangeText={v => update('notes', v)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        {/* 画像管理：追加・削除可能（更新ボタン押下でDB反映） */}
        <View style={styles.imageArea}>
          <ImageSection
            commission={commission}
            plan={plan}
            onUpdated={() => {
              fetchCommissionById(supabase, id!).then(c => {
                if (c) setCommission(c);
              });
            }}
            pendingDeletes={pendingImageDeletes}
            onDeletesChange={setPendingImageDeletes}
          />
        </View>

      </ScrollView>

      {/* ── フッターボタン ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.replace(`/commission/${id}`)}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isValid || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>
              {pendingImageDeletes.length > 0
                ? `更新する（画像${pendingImageDeletes.length}枚削除）`
                : '更新する'
              }
            </Text>
          }
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
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
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  errorBox: {
    backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5',
    borderRadius: 10, padding: 12,
  },
  errorBoxText: { color: '#b91c1c', fontSize: 13 },
  errorText: { color: '#aaa', fontSize: 15, marginBottom: 16 },
  backButton: {
    backgroundColor: '#7c3aed', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backButtonText: { color: '#fff', fontWeight: 'bold' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  required: { color: '#ef4444' },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, padding: 12, fontSize: 16, color: '#1a0a2e',
  },
  textarea: { minHeight: 80 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  statusChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  statusChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  statusChipTextActive: { color: '#fff' },
  imageArea: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  cancelButtonText: { color: '#555', fontWeight: '600', fontSize: 15 },
  saveButton: {
    flex: 2, backgroundColor: '#7c3aed', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: '#c4b5fd' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
