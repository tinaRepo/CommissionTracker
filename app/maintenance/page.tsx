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
        <main style={{ minHeight: "100vh", padding: "24px 18px", display: "grid", placeItems: "center", background: "var(--surface-inverse)" }}>
            <section style={{
                width: "min(100%, 560px)", padding: "clamp(28px, 6vw, 48px)", background: "var(--bg)",
                borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)",
            }}>
                <div className="text-meta" style={{ fontWeight: 700, marginBottom: 40 }}>ツクリスト</div>
                <span className="badge badge-warn" style={{ marginBottom: 16, display: "inline-flex" }}>メンテナンスのお知らせ</span>
                <h1 style={{ fontSize: "clamp(22px, 5vw, 30px)", lineHeight: 1.4, margin: "0 0 16px", fontWeight: 700 }}>
                    ただいまメンテナンス中です
                </h1>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.9, margin: "0 0 28px", whiteSpace: "pre-wrap" }}>
                    {message || "サービス品質向上のため、ただいまメンテナンスを行っています。終了までしばらくお待ちください。"}
                </p>
                <div style={{ height: 1, background: "var(--border-soft)", marginBottom: 18 }} />
                <div className="row" style={{ justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <p style={{ color: "var(--meta)", fontSize: 12, lineHeight: 1.7 }}>
                        復旧後にページを再読み込みしてください。
                    </p>
                    <a href="/" className="btn btn-primary btn-sm">再読み込み</a>
                </div>
            </section>
        </main>
    );
}
