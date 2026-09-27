"use client";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function InstallPromptBanner() {
    const { visible, platform, install, dismiss } = useInstallPrompt();
    if (!visible) return null;

    return (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", justifyContent: "center", padding: 16, pointerEvents: "none" }}>
            <style>{`@keyframes ctSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{
                pointerEvents: "auto", width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20,
                padding: "18px 20px", boxShadow: "0 8px 32px #0004", border: "1.5px solid #ede9fe",
                display: "flex", gap: 14, alignItems: "flex-start", animation: "ctSlideUp 0.25s ease",
            }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg,#1a0a2e,#2d1a4a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎨</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#1a0a2e", marginBottom: 4 }}>ホーム画面に追加しませんか？</div>
                    {platform === "ios" ? (
                        <div style={{ fontSize: 12.5, color: "#666", lineHeight: 1.7 }}>
                            Safari下部の共有ボタン（□に↑）から「ホーム画面に追加」を選ぶと、アプリのように使えます。プッシュ通知もこの状態でのみ届きます。
                        </div>
                    ) : (
                        <div style={{ fontSize: 12.5, color: "#666", lineHeight: 1.7 }}>
                            アプリのように使えて、納期通知も受け取りやすくなります。
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        {platform === "android" && (
                            <button onClick={install} style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                追加する
                            </button>
                        )}
                        <button onClick={dismiss} style={{ background: "#f3f4f6", color: "#666", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                            あとで
                        </button>
                    </div>
                </div>
                <button onClick={dismiss} aria-label="閉じる" style={{ background: "none", border: "none", fontSize: 16, color: "#bbb", cursor: "pointer", flexShrink: 0 }}>×</button>
            </div>
        </div>
    );
}