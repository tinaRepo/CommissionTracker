import type { SupabaseClient } from './client';
import type { Plan, UserProfile } from '../types/index';
import { PLAN_LIMITS } from '../types/index';

export async function fetchMyProfile(
    supabase: SupabaseClient
): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    if (error) {
        console.error('fetchMyProfile error:', error);
        return null;
    }
    return data;
}

export async function countMyImages(
    supabase: SupabaseClient
): Promise<number> {
    const { count, error } = await supabase
        .from('commission_images')
        .select('id', { count: 'exact', head: true })
        .in(
            'commission_id',
            (await supabase.from('commissions').select('id')).data?.map(c => c.id) ?? []
        );
    if (error) return 0;
    return count ?? 0;
}

export async function canUploadImage(
    supabase: SupabaseClient,
    plan: Plan
): Promise<{ ok: boolean; current: number; limit: number | null }> {
    const limit = PLAN_LIMITS[plan].imageLimit;
    if (limit === null) return { ok: true, current: 0, limit: null };
    const current = await countMyImages(supabase);
    return { ok: current < limit, current, limit };
}

export async function adminFetchAllUsers(
    supabase: SupabaseClient
): Promise<UserProfile[]> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function adminUpdateUserPlan(
    supabase: SupabaseClient,
    userId: string,
    plan: Plan
): Promise<void> {
    const { error } = await supabase
        .from('user_profiles')
        .update({ plan })
        .eq('id', userId);
    if (error) throw error;
}

export async function requestDeleteAccount(
    supabase: SupabaseClient
): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const res = await fetch('/api/request-delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? '送信に失敗しました');
    }
}

export async function adminDeleteUser(
    supabase: SupabaseClient,
    userId: string
): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? '削除に失敗しました');
    }
}