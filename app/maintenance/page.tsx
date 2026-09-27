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
            minHeight: "100vh", padding: "24px 18px", display: "grid", placeItems: "center",
            background: "linear-gradient(135deg, #f3f7f5 0%, #f7f5f1 56%, #e9f1ef 100%)",
            color: "#172b2b", fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif",
        }}>
            <section style={{
                width: "min(100%, 600px)", padding: "clamp(28px, 7vw, 56px)", background: "#fff",
                border: "1px solid #dce6e2", borderRadius: 16, boxShadow: "0 18px 55px #183b3212",
            }}>
                <div style={{
                    display: "flex", alignItems: "center", gap: 10, marginBottom: 48,
                    whiteSpace: "nowrap", color: "#254b45", fontSize: 12, fontWeight: 800,
                }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, flexShrink: 0, borderRadius: "50%", background: "#d28c35" }} />
                    <span>COMMISSION TRACKER</span>
                </div>
                <div style={{
                    display: "inline-flex", alignItems: "center", minHeight: 28, padding: "4px 10px",
                    borderRadius: 6, background: "#fff5e7", color: "#875313", fontSize: 12, fontWeight: 700,
                    marginBottom: 16,
                }}>
                    メンテナンスのお知らせ
                </div>
                <h1 style={{ fontSize: "clamp(25px, 6vw, 34px)", lineHeight: 1.4, margin: "0 0 16px", fontWeight: 800, color: "#172b2b" }}>
                    ただいまメンテナンス中です
                </h1>
                <p style={{ color: "#4c5e5a", fontSize: 15, lineHeight: 1.9, margin: "0 0 28px", whiteSpace: "pre-wrap" }}>
                    {message || "サービス品質向上のため、ただいまメンテナンスを行っています。終了までしばらくお待ちください。"}
                </p>
                <div style={{ height: 1, background: "#e8eeeb", marginBottom: 18 }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <p style={{ color: "#77847f", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
                        復旧後にページを再読み込みしてください。
                    </p>
                    <a href="/" style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 42,
                        padding: "9px 16px", borderRadius: 8, background: "#214b44", color: "#fff",
                        fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
                    }}>
                        再読み込み
                    </a>
                </div>
            </section>
        </main>
    );
}