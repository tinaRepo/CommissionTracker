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

    return (
        <main style={{
            minHeight: "100vh", padding: 24, display: "grid", placeItems: "center",
            background: "linear-gradient(145deg, #1a0a2e 0%, #252044 56%, #16434a 100%)",
            color: "#1a0a2e", fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif",
        }}>
            <section style={{
                width: "min(100%, 520px)", padding: "clamp(28px, 6vw, 48px)",
                background: "#fff", borderRadius: 20, boxShadow: "0 24px 70px #0005",
            }}>
                <div aria-hidden="true" style={{
                    color: code === "404" ? "#0f766e" : code === "OFFLINE" ? "#0f766e" : "#b91c1c", fontSize: 13,
                    fontWeight: 800, marginBottom: 12,
                }}>
                    COMMISSION TRACKER <span style={{ color: "#a3a3a3", fontWeight: 500 }}> / {code}</span>
                </div>
                <div style={{
                    color: code === "404" || code === "OFFLINE" ? "#0f766e" : "#b91c1c", fontSize: 64,
                    fontWeight: 900, lineHeight: 1, marginBottom: 20, fontVariantNumeric: "tabular-nums",
                }}>
                    {code}
                </div>
                <h1 style={{ fontSize: 23, lineHeight: 1.4, margin: "0 0 10px", fontWeight: 800 }}>
                    {title}
                </h1>
                <p style={{ color: "#626262", fontSize: 14, lineHeight: 1.8, margin: "0 0 28px" }}>
                    {description}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {onRetry && (
                        <button type="button" onClick={onRetry} style={{
                            flex: "1 1 180px", minHeight: 46, padding: "10px 16px", border: 0,
                            borderRadius: 10, background: "#1a0a2e", color: "#fff", fontSize: 14,
                            fontWeight: 700, cursor: "pointer",
                        }}>
                            もう一度読み込む
                        </button>
                    )}
                    <button type="button" onClick={() => router.push("/")} style={{
                        flex: "1 1 150px", minHeight: 46, padding: "10px 16px", border: "1px solid #d1d5db",
                        borderRadius: 10, background: "#fff", color: "#303030", fontSize: 14,
                        fontWeight: 700, cursor: "pointer",
                    }}>
                        ホームへ戻る
                    </button>
                </div>
            </section>
        </main>
    );
}