import Script from "next/script";
import { PageViewTracker } from '../components/PageViewTracker';
import type { Metadata } from "next";
import "./globals.css";
import "./components.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://commission-tracker-nine.vercel.app"),
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
  other: { "mobile-web-app-capable": "yes" },
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
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4461599437148086"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <PageViewTracker />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VL43MH743Z"
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />

        {/* 初期化 */}
        <Script id="ga-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-VL43MH743Z', {
                send_page_view: false
            });
          `}
        </Script>
      </body>
    </html>
  );
}
