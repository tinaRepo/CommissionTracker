import { useState, useEffect } from 'react';
import type { SupabaseClient } from '../supabase/index';
import { fetchMyProfile } from '../supabase/index';
import type { UserProfile, Plan } from '../types/index';

export interface UseAuthReturn {
    userId: string | null;
    profile: UserProfile | null;
    plan: Plan;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

export function useAuth(supabase: SupabaseClient): UseAuthReturn {
    const [userId, setUserId] = useState<string | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const plan: Plan = profile?.plan ?? 'free';

    async function loadProfile() {
        const p = await fetchMyProfile(supabase);
        setProfile(p);
    }

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const uid = session?.user?.id ?? null;
                setUserId(uid);
                if (uid) {
                    await loadProfile();
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (userId) loadProfile();
    }, [userId]);

    async function signOut() {
        await supabase.auth.signOut();
    }

    return { userId, profile, plan, loading, signOut, refreshProfile: loadProfile };
}