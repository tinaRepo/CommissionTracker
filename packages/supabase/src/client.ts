import { createBrowserClient } from '@supabase/ssr';

export function createClient(url: string, anonKey: string) {
    return createBrowserClient(url, anonKey);
}

// supabaseインスタンスの型をexport（各関数で使う）
export type SupabaseClient = ReturnType<typeof createClient>;