import type { SupabaseClient } from './client';
import type { CommissionImage, ImageType, Plan } from '../types/index';
import { canUploadImage } from './user';

const BUCKET = 'commission-images';

export async function uploadImage(
    supabase: SupabaseClient,
    commissionId: string,
    file: File,
    imageType: ImageType,
    plan: Plan
): Promise<CommissionImage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { ok, current, limit } = await canUploadImage(supabase, plan);
    if (!ok) throw new Error(`PLAN_LIMIT:${current}:${limit}`);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${commissionId}/${imageType}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
        .from('commission_images')
        .insert({
            commission_id: commissionId,
            storage_path: path,
            file_name: file.name,
            image_type: imageType,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteImage(
    supabase: SupabaseClient,
    image: CommissionImage
): Promise<void> {
    await supabase.storage.from(BUCKET).remove([image.storage_path]);
    await supabase.from('commission_images').delete().eq('id', image.id);
}

export async function getSignedImageUrl(
    supabase: SupabaseClient,
    storagePath: string
): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 3600);
    if (error) throw error;
    return data.signedUrl;
}