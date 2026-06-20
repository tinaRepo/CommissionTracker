import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image, Alert,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { createCommission } from '../../lib/packages/supabase/commissions';
import { PLAN_LIMITS } from '../../lib/packages/types/index';
import type { CommissionStatus, ImageType, Plan } from '../../lib/packages/types/index';
import DatePickerField from '../../components/DatePickerField';
import * as FileSystem from 'expo-file-system/legacy';

const STATUSES: { key: CommissionStatus; label: string }[] = [
  { key: 'pending', label: '依頼済み' },
  { key: 'rough', label: 'ラフ確認中' },
  { key: 'progress', label: '制作中' },
  { key: 'done', label: '完成' },
  { key: 'cancelled', label: 'キャンセル' },
];

const IMAGE_TYPES: { key: ImageType; label: string }[] = [
  { key: 'rough', label: 'ラフ' },
  { key: 'wip', label: '作業中' },
  { key: 'finished', label: '完成' },
  { key: 'other', label: 'その他' },
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

type PendingImage = {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  imageType: ImageType;
};

const EMPTY_FORM: FormValues = {
  title: '', artist: '', x_id: '', ordered_at: '', deadline: '',
  rough_date: '', price: '', currency: 'JPY', status: 'pending', notes: '',
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

type Props = {
  plan?: Plan;
  imageCount?: number;
};

export default function NewCommissionScreen({ plan = 'free', imageCount = 0 }: Props) {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingImageType, setPendingImageType] = useState<ImageType>('rough');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof FormValues, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handlePickImage() {
    const limit = PLAN_LIMITS[plan].imageLimit;
    const totalAfter = imageCount + pendingImages.length;
    if (limit !== null && totalAfter >= limit) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'フォトライブラリへのアクセスを許可してください');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPendingImages(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      uri: asset.uri,
      fileName: asset.fileName ?? `image_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      imageType: pendingImageType,
    }]);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.artist.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const newCommission = await createCommission(supabase, {
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

      if (pendingImages.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          for (const pi of pendingImages) {
            try {
              const ext = pi.fileName.split('.').pop();
              const path = `${user.id}/${newCommission.id}/${pi.imageType}_${Date.now()}.${ext}`;
              const response = await fetch(pi.uri);

              const base64 = await FileSystem.readAsStringAsync(pi.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const binaryStr = atob(base64);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }

              const { error: uploadError } = await supabase.storage
                .from('commission-images')
                .upload(path, bytes, { contentType: pi.mimeType, upsert: false });
              if (uploadError) continue;
              await supabase.from('commission_images').insert({
                commission_id: newCommission.id,
                storage_path: path,
                file_name: pi.fileName,
                image_type: pi.imageType,
              });
            } catch {
              // 1枚失敗しても続行
            }
          }
        }
      }

      router.replace('/home');
    } catch {
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  const limit = PLAN_LIMITS[plan].imageLimit;
  const totalAfter = imageCount + pendingImages.length;
  const atLimit = limit !== null && totalAfter >= limit;
  const isValid = form.title.trim() && form.artist.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新規依頼を登録</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        <Field label="件名" required>
          <TextInput style={styles.input} placeholder="例: アイコン用イラスト"
            placeholderTextColor="#aaa" value={form.title} onChangeText={v => update('title', v)} />
        </Field>

        <Field label="絵師名" required>
          <TextInput style={styles.input} placeholder="例: 花咲りん"
            placeholderTextColor="#aaa" value={form.artist} onChangeText={v => update('artist', v)} />
        </Field>

        <Field label="X ID（任意）">
          <TextInput style={styles.input} placeholder="例: @artist_name"
            placeholderTextColor="#aaa" value={form.x_id} onChangeText={v => update('x_id', v)}
            autoCapitalize="none" />
        </Field>

        <DatePickerField label="依頼日" value={form.ordered_at} onChange={v => update('ordered_at', v)} />
        <DatePickerField label="納期" value={form.deadline} onChange={v => update('deadline', v)} />
        <DatePickerField label="ラフ提出日（任意）" value={form.rough_date} onChange={v => update('rough_date', v)} />

        <Field label="金額（円）">
          <TextInput style={styles.input} placeholder="例: 5000"
            placeholderTextColor="#aaa" value={form.price}
            onChangeText={v => update('price', v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric" />
        </Field>

        <Field label="ステータス">
          <View style={styles.statusGrid}>
            {STATUSES.map(s => (
              <TouchableOpacity key={s.key}
                style={[styles.statusChip, form.status === s.key && styles.statusChipActive]}
                onPress={() => update('status', s.key)}>
                <Text style={[styles.statusChipText, form.status === s.key && styles.statusChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="メモ（任意）">
          <TextInput style={[styles.input, styles.textarea]}
            placeholder="色味の指定や注意点など" placeholderTextColor="#aaa"
            value={form.notes} onChangeText={v => update('notes', v)}
            multiline numberOfLines={4} textAlignVertical="top" />
        </Field>

        {/* 画像追加エリア */}
        <Field label="画像（任意・登録後にも追加できます）">
          {pendingImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
              {pendingImages.map(pi => (
                <View key={pi.id} style={styles.previewWrap}>
                  <Image source={{ uri: pi.uri }} style={styles.previewThumb} />
                  <View style={styles.typeLabel}>
                    <Text style={styles.typeLabelText}>
                      {IMAGE_TYPES.find(t => t.key === pi.imageType)?.label}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.removeButton}
                    onPress={() => setPendingImages(prev => prev.filter(x => x.id !== pi.id))}>
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeRow}>
              {IMAGE_TYPES.map(t => (
                <TouchableOpacity key={t.key}
                  style={[styles.typeChip, pendingImageType === t.key && styles.typeChipActive]}
                  onPress={() => setPendingImageType(t.key)}>
                  <Text style={[styles.typeChipText, pendingImageType === t.key && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.uploadButton, atLimit && styles.uploadButtonDisabled]}
            onPress={handlePickImage} disabled={atLimit}>
            <Text style={[styles.uploadButtonText, atLimit && styles.uploadButtonTextDisabled]}>
              {atLimit ? `上限に達しました（${limit}枚）` : '＋ 画像を追加'}
            </Text>
          </TouchableOpacity>

          {pendingImages.length > 0 && (
            <Text style={styles.uploadNote}>
              ※ 登録ボタンを押すと画像もまとめてアップロードされます
            </Text>
          )}
        </Field>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton}
          onPress={() => router.replace('/home')} disabled={saving}>
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
          onPress={handleSave} disabled={!isValid || saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.saveButtonText}>
              {pendingImages.length > 0 ? `登録する（画像${pendingImages.length}枚）` : '登録する'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
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
  errorText: { color: '#b91c1c', fontSize: 13 },
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
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  statusChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  statusChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  statusChipTextActive: { color: '#fff' },
  previewRow: { marginBottom: 8 },
  previewWrap: { position: 'relative', marginRight: 10 },
  previewThumb: {
    width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: '#c4b5fd',
  },
  typeLabel: {
    position: 'absolute', top: 3, left: 3, backgroundColor: '#1a0a2ecc',
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  typeLabelText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  removeButton: {
    position: 'absolute', top: 3, right: 3, backgroundColor: '#ef4444cc',
    borderRadius: 9, width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  removeButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  typeChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  typeChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  typeChipTextActive: { color: '#fff' },
  uploadButton: {
    borderWidth: 1.5, borderColor: '#c4b5fd', borderStyle: 'dashed',
    borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#fff',
  },
  uploadButtonDisabled: { borderColor: '#fca5a5', backgroundColor: '#f3f4f6' },
  uploadButtonText: { color: '#7c3aed', fontWeight: '600', fontSize: 13 },
  uploadButtonTextDisabled: { color: '#ef4444' },
  uploadNote: { fontSize: 11, color: '#888', textAlign: 'center' },
  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  cancelButtonText: { color: '#555', fontWeight: '600', fontSize: 15 },
  saveButton: {
    flex: 2, backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: '#c4b5fd' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
