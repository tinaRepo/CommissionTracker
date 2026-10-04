"use client";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Icon } from "@/components/TaskShared";

export default function InstallPromptBanner() {
    const { visible, platform, install, dismiss } = useInstallPrompt();
    if (!visible) return null;

    return (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 300, display: "flex", justifyContent: "center", padding: 16, pointerEvents: "none" }}>
            <div className="panel" style={{
                pointerEvents: "auto", width: "100%", maxWidth: 460,
                padding: "18px 20px", display: "flex", gap: 14, alignItems: "flex-start",
            }}>
                <div style={{
                    width: 40, height: 40, borderRadius: "var(--radius-md)", flexShrink: 0,
                    background: "var(--surface-inverse)", color: "var(--fg-on-inverse)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <Icon name="download" size={18} />
                </div>
                <div className="grow">
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>ホーム画面に追加しませんか？</div>
                    {platform === "ios" ? (
                        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7 }}>
                            Safari下部の共有ボタンから「ホーム画面に追加」を選ぶと、アプリのように使えます。プッシュ通知もこの状態でのみ届きます。
                        </div>
                    ) : (
                        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7 }}>
                            アプリのように使えて、納期通知も受け取りやすくなります。
                        </div>
                    )}
                    <div className="row" style={{ gap: 8, marginTop: 12 }}>
                        {platform === "android" && (
                            <button onClick={install} className="btn btn-primary btn-sm">追加する</button>
                        )}
                        <button onClick={dismiss} className="btn btn-secondary btn-sm">あとで</button>
                    </div>
                </div>
                <button onClick={dismiss} aria-label="閉じる" className="icon-btn"
                    style={{ background: "none", border: "none", color: "var(--meta)", width: "auto", height: "auto" }}>
                    <Icon name="close" size={16} />
                </button>
            </div>
        </div>
    );
}
