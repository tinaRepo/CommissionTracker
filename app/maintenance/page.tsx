import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// メンテナンス中ページ
export default async function MaintenancePage() {
    let message: string | null = null;
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data } = await supabase
            .from("app_settings")
            .select("maintenance_message")
            .eq("setting_key", "maintenance")
            .maybeSingle();
        message = data?.maintenance_message ?? null;
    } catch {
        message = null;
    }

    return (
        <main style={{
            minHeight: "100vh", padding: 24, display: "grid", placeItems: "center",
            background: "linear-gradient(145deg, #1a0a2e 0%, #252044 56%, #16434a 100%)",
            color: "#1a0a2e", fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif",
        }}>
            <section style={{ width: "min(100%, 560px)", padding: "clamp(28px, 6vw, 48px)", background: "#fff", borderRadius: 20, boxShadow: "0 24px 70px #0005" }}>
                <div style={{ color: "#0f766e", fontSize: 13, fontWeight: 800, marginBottom: 14 }}>COMMISSION TRACKER / SERVICE NOTICE</div>
                <div aria-hidden="true" style={{ fontSize: 42, marginBottom: 14 }}>🛠️</div>
                <h1 style={{ fontSize: 25, lineHeight: 1.4, margin: "0 0 12px", fontWeight: 800 }}>メンテナンス中です</h1>
                <p style={{ color: "#555", fontSize: 14, lineHeight: 1.9, margin: "0 0 24px", whiteSpace: "pre-wrap" }}>
                    {message || "サービス品質向上のため、ただいまメンテナンスを行っています。終了までしばらくお待ちください。"}
                </p>
                <p style={{ color: "#888", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
                    メンテナンス終了後に、ページを再読み込みしてください。
                </p>
            </section>
        </main>
    );
}