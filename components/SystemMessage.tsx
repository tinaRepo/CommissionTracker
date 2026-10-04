"use client";

import { useRouter } from "next/navigation";

type Props = {
    code: string;
    title: string;
    description: string;
    onRetry?: () => void;
};

export default function SystemMessage({ code, title, description, onRetry }: Props) {
    const router = useRouter();
    const isNeutral = code === "404" || code === "OFFLINE";

    return (
        <main style={{
            minHeight: "100vh", padding: 24, display: "grid", placeItems: "center",
            background: "var(--surface-inverse)",
        }}>
            <section style={{
                width: "min(100%, 480px)", padding: "clamp(28px, 6vw, 44px)",
                background: "var(--bg)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)",
            }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.04em" }}>
                    ツクリスト <span style={{ color: "var(--meta)", fontWeight: 500 }}>/ {code}</span>
                </div>
                <div style={{
                    color: isNeutral ? "var(--accent)" : "var(--danger)", fontSize: 56,
                    fontWeight: 700, lineHeight: 1, marginBottom: 20, fontVariantNumeric: "tabular-nums",
                }}>
                    {code}
                </div>
                <h1 style={{ fontSize: 21, lineHeight: 1.4, marginBottom: 10, fontWeight: 700 }}>
                    {title}
                </h1>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
                    {description}
                </p>
                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                    {onRetry && (
                        <button type="button" onClick={onRetry} className="btn btn-primary" style={{ flex: "1 1 160px" }}>
                            もう一度読み込む
                        </button>
                    )}
                    <button type="button" onClick={() => router.push("/")} className="btn btn-secondary" style={{ flex: "1 1 140px" }}>
                        ホームへ戻る
                    </button>
                </div>
            </section>
        </main>
    );
}
