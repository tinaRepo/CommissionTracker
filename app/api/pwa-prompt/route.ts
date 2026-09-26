import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ct_pwa_prompt";
const MAX_AGE = 60 * 60 * 24 * 365; // 1年

// ─── 型定義 ─────
type PromptState = {
    visits: number;
    dismissCount: number;
    lastDismissedAt: number | null;
    neverShow: boolean;
};

const DEFAULT_STATE: PromptState = { visits: 0, dismissCount: 0, lastDismissedAt: null, neverShow: false };

// ─── ユーティリティ関数 ─────
function readState(req: NextRequest): PromptState {
    const raw = req.cookies.get(COOKIE_NAME)?.value;
    if (!raw) return DEFAULT_STATE;
    try { return { ...DEFAULT_STATE, ...JSON.parse(raw) }; } catch { return DEFAULT_STATE; }
}

// GET: 現在の状態を返す（バナー表示可否の判定用）
export async function GET(req: NextRequest) {
    return NextResponse.json(readState(req));
}

// POST: { action: "visit" | "dismiss" | "installed" } で状態を更新
export async function POST(req: NextRequest) {
    const { action } = await req.json();
    const state = readState(req);

    if (action === "visit") {
        state.visits += 1;
    } else if (action === "dismiss") {
        state.dismissCount += 1;
        state.lastDismissedAt = Date.now();
        if (state.dismissCount >= 3) state.neverShow = true;
    } else if (action === "installed") {
        state.neverShow = true;
    }

    const res = NextResponse.json(state);
    res.cookies.set(COOKIE_NAME, JSON.stringify(state), {
        maxAge: MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: true,
        httpOnly: true,
    });
    return res;
}