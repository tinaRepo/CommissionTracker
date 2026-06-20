import { useState, useCallback } from 'react';
import type { SupabaseClient } from '../supabase/index';
import {
    uploadImage,
    deleteImage,
    getSignedImageUrl,
    countMyImages,
} from '../supabase/index';
import type { CommissionImage, ImageType, Plan } from '../types/index';

export interface UseImagesReturn {
    imageCount: number;
    signedUrls: Record<string, string>;
    uploading: boolean;
    upload: (commissionId: string, file: File, imageType: ImageType, plan: Plan) => Promise<CommissionImage>;
    remove: (image: CommissionImage) => Promise<void>;
    getSignedUrl: (storagePath: string) => Promise<string>;
    refreshCount: () => Promise<void>;
}

export function useImages(supabase: SupabaseClient): UseImagesReturn {
    const [imageCount, setImageCount] = useState(0);
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState(false);

    const refreshCount = useCallback(async () => {
        const count = await countMyImages(supabase);
        setImageCount(count);
    }, [supabase]);

    async function upload(
        commissionId: string,
        file: File,
        imageType: ImageType,
        plan: Plan
    ): Promise<CommissionImage> {
        setUploading(true);
        try {
            const image = await uploadImage(supabase, commissionId, file, imageType, plan);
            await refreshCount();
            return image;
        } finally {
            setUploading(false);
        }
    }

    async function remove(image: CommissionImage): Promise<void> {
        await deleteImage(supabase, image);
        await refreshCount();
        setSignedUrls((prev: Record<string, string>) => {
            const next = { ...prev };
            delete next[image.storage_path];
            return next;
        });
    }

    async function getSignedUrl(storagePath: string): Promise<string> {
        if (signedUrls[storagePath]) return signedUrls[storagePath];
        const url = await getSignedImageUrl(supabase, storagePath);
        setSignedUrls((prev: Record<string, string>) => ({ ...prev, [storagePath]: url }));
        return url;
    }

    return { imageCount, signedUrls, uploading, upload, remove, getSignedUrl, refreshCount };
}