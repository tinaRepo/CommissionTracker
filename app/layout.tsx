import { PageViewTracker } from '../components/PageViewTracker';
import AdSenseLoader from "@/components/AdSenseLoader";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";
import "./components.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ツクリスト | 納期・タスク管理ツール",
    template: "%s | ツクリスト",
  },
  description: "依頼・タスクの納期を一元管理できる無料Webアプリ。依頼状況・納期・金額・確認用画像をまとめて管理。作り手への依頼をもう迷子にしない。",
  applicationName: "ツクリスト",
  keywords: ["タスク管理", "納期管理", "依頼管理", "外注管理", "スケジュール管理"],
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "ツクリスト",
    title: "ツクリスト | 納期・タスク管理ツール",
    description: "依頼状況・納期・金額・画像をまとめて管理できる無料Webアプリ。",
    images: [{ url: "/web-app-manifest-512x512.png", width: 512, height: 512, alt: "ツクリスト" }],
  },
  twitter: { card: "summary", title: "ツクリスト | 納期・タスク管理ツール" },
  other: {
    "mobile-web-app-capable": "yes",
    // AdSenseのサイト所有確認用（広告は読み込まない）。広告スクリプトは AdSenseLoader が公開ページだけで読み込む
    "google-adsense-account": "ca-pub-4461599437148086",
  },
  appleWebApp: {
    capable: true,
    title: "ツクリスト",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-96x96.png', sizes: '96x96' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <PageViewTracker />
        <AdSenseLoader />


      </body>
    </html>
  );
}
