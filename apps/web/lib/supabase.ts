import { createClient } from '@commission-tracker/supabase';

// ブラウザ（クライアントサイド）用インスタンス
// app/api/ 配下のroute.tsはサーバーサイドのため @supabase/supabase-js を直接使用
export const sharedSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);