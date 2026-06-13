import type { SupabaseClient } from './client';
import type { Commission } from '../types/index';

export async function fetchCommissions(
    supabase: SupabaseClient
): Promise<Commission[]> {
    const { data, error } = await supabase
        .from('commissions')
        .select('*, images:commission_images(*)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function fetchCommissionById(
    supabase: SupabaseClient,
    id: string
): Promise<Commission | null> {
    const { data, error } = await supabase
        .from('commissions')
        .select('*, images:commission_images(*)')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function createCommission(
    supabase: SupabaseClient,
    values: Omit<Commission, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'images'>
): Promise<Commission> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
        .from('commissions')
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateCommission(
    supabase: SupabaseClient,
    id: string,
    values: Partial<Omit<Commission, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'images'>>
): Promise<Commission> {
    const { data, error } = await supabase
        .from('commissions')
        .update(values)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteCommission(
    supabase: SupabaseClient,
    id: string
): Promise<void> {
    const { error } = await supabase.from('commissions').delete().eq('id', id);
    if (error) throw error;
}