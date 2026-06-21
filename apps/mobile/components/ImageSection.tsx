import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { supabase } from '../lib/supabase';
import { getSignedImageUrl, deleteImage } from '@commission-tracker/supabase';
import { PLAN_LIMITS } from '@commission-tracker/types';
import type { Commission, CommissionImage, ImageType, Plan } from '@commission-tracker/types';

const IMAGE_TYPES: { key: ImageType; label: string }[] = [
  { key: 'rough', label: 'ラフ' },
  { key: 'wip', label: '作業中' },
  { key: 'finished', label: '完成' },
  { key: 'other', label: 'その他' },
];

type Props = {
  commission: Commission;
  plan: Plan;
  onUpdated: () => void;
  /** true: 表示のみ（追加・削除ボタン非表示） */
  readonly?: boolean;
  /** true: DLボタン表示 */
  showDownload?: boolean;
  /** 画像タップ時のコールバック（プレビュー表示は呼び出し元で管理） */
  onPreview?: (url: string, fileName: string) => void;
  /** 削除予定画像リスト（編集画面で遅延削除に使用） */
  pendingDeletes?: CommissionImage[];
  /** 削除予定リスト変更コールバック */
  onDeletesChange?: (images: CommissionImage[]) => void;
};

export default function ImageSection({
  commission,
  plan,
  onUpdated,
  readonly = false,
  showDownload = false,
  onPreview,
  pendingDeletes,
  onDeletesChange,
}: Props) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [imageType, setImageType] = useState<ImageType>('rough');
  const [uploading, setUploading] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  const images = commission.images ?? [];
  const limit = PLAN_LIMITS[plan].imageLimit;
  const atLimit = limit !== null && images.length >= limit;

  // ---- SignedURL取得 ----
  useEffect(() => {
    if (!images.length) return;
    Promise.all(
      images.map(async img => {
        const url = await getSignedImageUrl(supabase, img.storage_path).catch(() => '');
        return [img.id, url] as [string, string];
      })
    ).then(entries => setSignedUrls(Object.fromEntries(entries)));
  }, [commission.images]);

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

  // ---- 画像選択・アップロード ----
  async function handlePickImage() {
    if (readonly) return;
    setLimitError(null);
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
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const planLimits = PLAN_LIMITS[plan];
      if (planLimits.imageLimit !== null && images.length >= planLimits.imageLimit) {
        throw new Error(`PLAN_LIMIT:${images.length}:${planLimits.imageLimit}`);
      }

      const uri = asset.uri;
      const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
      const type = asset.mimeType ?? 'image/jpeg';
      const ext = fileName.split('.').pop();
      const path = `${user.id}/${commission.id}/${imageType}_${Date.now()}.${ext}`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('commission-images')
        .upload(path, bytes, { contentType: type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('commission_images')
        .insert({
          commission_id: commission.id,
          storage_path: path,
          file_name: fileName,
          image_type: imageType,
        });
      if (dbError) throw dbError;

      onUpdated();
    } catch (err: any) {
      if (err.message?.startsWith('PLAN_LIMIT:')) {
        const [, current, lim] = err.message.split(':');
        setLimitError(`${PLAN_LIMITS[plan].label}プランの上限（${lim}枚）に達しています`);
      } else {
        Alert.alert('エラー', 'アップロードに失敗しました');
      }
    } finally {
      setUploading(false);
    }
  }

  // ---- 画像削除 ----
  async function handleDelete(img: CommissionImage) {
    if (onDeletesChange && pendingDeletes !== undefined) {
      const alreadyPending = pendingDeletes.some(d => d.id === img.id);
      if (alreadyPending) {
        onDeletesChange(pendingDeletes.filter(d => d.id !== img.id));
      } else {
        Alert.alert(
          '削除対象に追加',
          `「${img.file_name}」を削除対象にします。\n※「更新する」ボタンを押すまでDBからは削除されません。`,
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '削除対象にする',
              style: 'destructive',
              onPress: () => onDeletesChange([...pendingDeletes, img]),
            },
          ]
        );
      }
      return;
    }
    Alert.alert('画像を削除', '本当に削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteImage(supabase, img);
            onUpdated();
          } catch {
            Alert.alert('エラー', '削除に失敗しました');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>📷 添付画像</Text>

      {limitError && (
        <View style={styles.limitError}>
          <Text style={styles.limitErrorText}>⚠ {limitError}</Text>
        </View>
      )}

      {images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
          {images.map(img => {
            const url = signedUrls[img.id];
            const typeLabel = IMAGE_TYPES.find(t => t.key === img.image_type)?.label ?? img.image_type;
            const isPendingDelete = pendingDeletes?.some(d => d.id === img.id) ?? false;
            return (
              <View key={img.id} style={[styles.imageWrap, isPendingDelete && styles.imageWrapPending]}>
                {isPendingDelete && (
                  <View style={styles.pendingOverlay}>
                    <Text style={styles.pendingText}>削除予定</Text>
                  </View>

                )}
                {url ? (
                  <TouchableOpacity
                    onPress={() => onPreview && onPreview(url, img.file_name)}
                    activeOpacity={onPreview ? 0.7 : 1}
                  >
                    <Image source={{ uri: url }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailEmpty]}>
                    <ActivityIndicator color="#7c3aed" size="small" />
                  </View>
                )}
                <View style={styles.typeLabel}>
                  <Text style={styles.typeLabelText}>{typeLabel}</Text>
                </View>
                {!readonly && (
                  <TouchableOpacity
                    style={[styles.deleteButton, isPendingDelete && styles.undoButton]}
                    onPress={() => handleDelete(img)}
                  >
                    <Text style={styles.deleteButtonText}>{isPendingDelete ? '↩' : '×'}</Text>
                  </TouchableOpacity>
                )}
                {showDownload && url && (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(url, img.file_name)}
                  >
                    <Text style={styles.downloadButtonText}>↓</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>画像はありません</Text>
      )}

      {!readonly && (
        <View style={styles.uploadArea}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeRow}>
              {IMAGE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, imageType === t.key && styles.typeChipActive]}
                  onPress={() => setImageType(t.key)}
                >
                  <Text style={[styles.typeChipText, imageType === t.key && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[styles.uploadButton, (uploading || atLimit) && styles.uploadButtonDisabled]}
            onPress={handlePickImage}
            disabled={uploading || atLimit}
          >
            {uploading ? (
              <ActivityIndicator color="#7c3aed" size="small" />
            ) : (
              <Text style={[styles.uploadButtonText, atLimit && styles.uploadButtonTextDisabled]}>
                {atLimit ? `上限に達しました（${limit}枚）` : '＋ 画像を追加'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#555' },
  limitError: {
    backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5',
    borderRadius: 10, padding: 10,
  },
  limitErrorText: { color: '#b91c1c', fontSize: 12 },
  emptyText: { fontSize: 13, color: '#aaa' },
  imageRow: { flexDirection: 'row' },
  imageWrap: { position: 'relative', marginRight: 10 },
  imageWrapPending: { opacity: 0.5 },
  pendingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#ef444420', zIndex: 1, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  pendingText: { color: '#ef4444', fontSize: 9, fontWeight: 'bold' },
  thumbnail: {
    width: 90, height: 90, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  thumbnailEmpty: {
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  typeLabel: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: '#1a0a2ecc', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  typeLabelText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  deleteButton: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#ef4444cc', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  undoButton: { backgroundColor: '#10b981cc' },
  deleteButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  downloadButton: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: '#1a0a2ecc', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  downloadButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  uploadArea: { gap: 10 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  typeChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  typeChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  typeChipTextActive: { color: '#fff' },
  uploadButton: {
    borderWidth: 1.5, borderColor: '#c4b5fd', borderStyle: 'dashed',
    borderRadius: 10, padding: 12, alignItems: 'center',
    backgroundColor: '#fff',
  },
  uploadButtonDisabled: { borderColor: '#fca5a5', backgroundColor: '#f3f4f6' },
  uploadButtonText: { color: '#7c3aed', fontWeight: '600', fontSize: 13 },
  uploadButtonTextDisabled: { color: '#ef4444' },
});
