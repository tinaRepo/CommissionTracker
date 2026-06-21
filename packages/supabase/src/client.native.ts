import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient(url: string, anonKey: string) {
    return createSupabaseClient(url, anonKey, {
        auth: {
            persistSession: true,
            detectSessionInUrl: false,
        },
    });
}

export type SupabaseClient = ReturnType<typeof createClient>;