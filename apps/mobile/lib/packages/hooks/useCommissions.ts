import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '../supabase/index';
import {
    fetchCommissions,
    createCommission,
    updateCommission,
    deleteCommission,
} from '../supabase/index';
import type { Commission } from '../types/index';

export interface UseCommissionsReturn {
    commissions: Commission[];
    loading: boolean;
    saving: boolean;
    error: string | null;
    reload: (showLoading?: boolean) => Promise<void>;
    create: (values: Omit<Commission, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'images'>) => Promise<Commission>;
    update: (id: string, values: Partial<Omit<Commission, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'images'>>) => Promise<Commission>;
    remove: (id: string) => Promise<void>;
}

export function useCommissions(supabase: SupabaseClient): UseCommissionsReturn {
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const data = await fetchCommissions(supabase);
            setCommissions(data);
            setError(null);
        } catch (e) {
            setError('依頼の取得に失敗しました');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [supabase]);

    useEffect(() => { reload(); }, [reload]);

    async function create(
        values: Omit<Commission, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'images'>
    ): Promise<Commission> {
        setSaving(true);
        try {
            const created = await createCommission(supabase, values);
            return created;
        } finally {
            setSaving(false);
        }
    }

    async function update(
        id: string,
        values: Partial<Omit<Commission, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'images'>>
    ): Promise<Commission> {
        setSaving(true);
        try {
            const updated = await updateCommission(supabase, id, values);
            return updated;
        } finally {
            setSaving(false);
        }
    }

    async function remove(id: string): Promise<void> {
        setSaving(true);
        try {
            await deleteCommission(supabase, id);
        } finally {
            setSaving(false);
        }
    }

    return { commissions, loading, saving, error, reload, create, update, remove };
}