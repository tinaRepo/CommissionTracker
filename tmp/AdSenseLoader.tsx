"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ============================================================
// Google AdSense の読み込みを「公開コンテンツページ」だけに限定する。
// ログイン後のアプリ・ログイン画面・エラー/メンテナンス画面など、公開コンテンツの無い画面に
// 広告を出すのはAdSenseポリシー上のリスクになるため。
//
// - 所有確認用の <meta name="google-adsense-account"> は app/layout.tsx で全ページに出している
//   （広告は読み込まない。サイト所有の確認専用）
// - スクリプトは next/script ではなく手動で挿入する（next/script は data-nscript 属性を付与し、
//   AdSense側から警告が出るため。docs/seo-and-ads.md 参照）
// - 公開ページからアプリへは通常のリンク（フルページ遷移）なので、読み込んだスクリプトがアプリ内に残らない
// ============================================================

const ADSENSE_CLIENT = "ca-pub-4461599437148086";

// 広告を表示してよい公開ページ。/pricing はログインが必要なため含めない
export const AD_ALLOWED_PATHS = ["/lp", "/guide", "/terms", "/privacy", "/tokusho"];

export default function AdSenseLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (!AD_ALLOWED_PATHS.includes(pathname)) return;
    const w = window as unknown as { __adsenseLoaded?: boolean };
    if (w.__adsenseLoaded) return;
    w.__adsenseLoaded = true;

    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
  }, [pathname]);

  return null;
}
