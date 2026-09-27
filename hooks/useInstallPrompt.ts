"use client";
import { useEffect, useState, useCallback } from "react";

const MIN_VISITS_BEFORE_SHOW = 2;
const SNOOZE_DAYS_AFTER_DISMISS = 14;

// ─── 型定義 ─────
type PromptState = {
    visits: number;
    dismissCount: number;
    lastDismissedAt: number | null;
    neverShow: boolean;
};

// GET: 現在の状態を返す（バナー表示可否の判定用）
async function getState(): Promise<PromptState> {
    const res = await fetch("/api/pwa-prompt");
    return res.json();
}

// POST: { action: "visit" | "dismiss" | "installed" } で状態を更新
async function postAction(action: "visit" | "dismiss" | "installed"): Promise<PromptState> {
    const res = await fetch("/api/pwa-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
    });
    return res.json();
}
// ─── ユーティリティ関数 ─────
function isStandalone() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(display-mode: standalone)").matches
        || (window.navigator as any).standalone === true;
}
function isIOS() {
    return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isAndroid() {
    return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

// ─── フック本体 ─────
export function useInstallPrompt() {
    const [visible, setVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");

    // 初回マウント時に表示判定
    useEffect(() => {
        if (isStandalone()) return;

        (async () => {
            let state = await getState();
            if (state.neverShow) return;

            // 訪問回数はタブ・セッション単位で1回だけ加算
            if (!sessionStorage.getItem("ct_install_prompt_counted")) {
                state = await postAction("visit");
                sessionStorage.setItem("ct_install_prompt_counted", "1");
            }
            if (state.visits < MIN_VISITS_BEFORE_SHOW) return;

            if (state.lastDismissedAt) {
                const daysSince = (Date.now() - state.lastDismissedAt) / 86400000;
                if (daysSince < SNOOZE_DAYS_AFTER_DISMISS) return;
            }

            if (isIOS()) {
                setPlatform("ios");
                setTimeout(() => setVisible(true), 3000);
            } else if (isAndroid()) {
                setPlatform("android");
                const handler = (e: any) => {
                    e.preventDefault();
                    setDeferredPrompt(e);
                    setTimeout(() => setVisible(true), 1500);
                };
                window.addEventListener("beforeinstallprompt", handler);
                return () => window.removeEventListener("beforeinstallprompt", handler);
            }
        })();
    }, []);

    // インストール完了時にバナーを消す
    useEffect(() => {
        const onInstalled = () => {
            setVisible(false);
            postAction("installed");
        };
        window.addEventListener("appinstalled", onInstalled);
        return () => window.removeEventListener("appinstalled", onInstalled);
    }, []);

    // バナーの「あとで」ボタン押下時
    const dismiss = useCallback(async () => {
        setVisible(false);
        await postAction("dismiss");
    }, []);

    // バナーの「追加する」ボタン押下時
    const install = useCallback(async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setVisible(false);
        await postAction(outcome === "accepted" ? "installed" : "dismiss");
    }, [deferredPrompt]);

    return { visible, platform, install, dismiss };
}