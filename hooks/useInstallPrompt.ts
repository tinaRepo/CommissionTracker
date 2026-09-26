"use client";
import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "ct_install_prompt_v1";
const MIN_VISITS_BEFORE_SHOW = 2;      // 2回目以降の訪問で候補に入れる
const SNOOZE_DAYS_AFTER_DISMISS = 14;  // 「あとで」から14日は出さない
const MAX_DISMISS_COUNT = 3;           // 3回目の「あとで」でもう出さない

// 端末判定
type StoredState = {
    visitCount: number;
    dismissCount: number;
    lastDismissedAt: number | null;
    neverShow: boolean;
};

// ローカルストレージから状態を読み込む
function loadState(): StoredState {
    if (typeof window === "undefined") return { visitCount: 0, dismissCount: 0, lastDismissedAt: null, neverShow: false };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : { visitCount: 0, dismissCount: 0, lastDismissedAt: null, neverShow: false };
    } catch {
        return { visitCount: 0, dismissCount: 0, lastDismissedAt: null, neverShow: false };
    }
}

// ローカルストレージに状態を保存する
function saveState(state: StoredState) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// 端末判定
function isStandalone() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(display-mode: standalone)").matches
        || (window.navigator as any).standalone === true;
}

// iOSかどうかを判定する
function isIOS() {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Androidかどうかを判定する
function isAndroid() {
    return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

// インストールプロンプトの表示状態を管理するフック
export function useInstallPrompt() {
    const [visible, setVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");

    // 初回マウント時に表示条件をチェック
    useEffect(() => {
        if (isStandalone()) return; // 既にホーム画面から起動中なら何もしない

        const state = loadState();
        if (state.neverShow) return;
        if (state.dismissCount >= MAX_DISMISS_COUNT) return;

        // 訪問回数はセッション単位で1回だけ加算
        if (!sessionStorage.getItem("ct_install_prompt_counted")) {
            state.visitCount += 1;
            sessionStorage.setItem("ct_install_prompt_counted", "1");
            saveState(state);
        }
        if (state.visitCount < MIN_VISITS_BEFORE_SHOW) return;

        if (state.lastDismissedAt) {
            const daysSince = (Date.now() - state.lastDismissedAt) / 86400000;
            if (daysSince < SNOOZE_DAYS_AFTER_DISMISS) return;
        }

        if (isIOS()) {
            setPlatform("ios");
            const t = setTimeout(() => setVisible(true), 3000);
            return () => clearTimeout(t);
        }

        if (isAndroid()) {
            setPlatform("android");
            const handler = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setTimeout(() => setVisible(true), 1500);
            };
            window.addEventListener("beforeinstallprompt", handler);
            return () => window.removeEventListener("beforeinstallprompt", handler);
        }
    }, []);

    // インストール完了時に表示しないようにする
    useEffect(() => {
        const onInstalled = () => {
            setVisible(false);
            saveState({ ...loadState(), neverShow: true });
        };
        window.addEventListener("appinstalled", onInstalled);
        return () => window.removeEventListener("appinstalled", onInstalled);
    }, []);

    // 「あとで」を押したときの処理
    const dismiss = useCallback(() => {
        const state = loadState();
        const dismissCount = state.dismissCount + 1;
        saveState({ ...state, dismissCount, lastDismissedAt: Date.now(), neverShow: dismissCount >= MAX_DISMISS_COUNT });
        setVisible(false);
    }, []);

    // インストールを促すプロンプトを表示する
    const install = useCallback(async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setVisible(false);
        if (outcome === "accepted") saveState({ ...loadState(), neverShow: true });
        else dismiss();
    }, [deferredPrompt, dismiss]);

    return { visible, platform, install, dismiss };
}