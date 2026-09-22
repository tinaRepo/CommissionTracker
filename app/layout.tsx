import Script from "next/script";
import { PageViewTracker } from '../components/PageViewTracker';
import type { Metadata } from "next";
import "./globals.css";

export const metadata = {
  title: "Commission Tracker | 絵の依頼管理ツール",
  description: "イラスト・絵の依頼を一元管理できる無料Webアプリ。依頼状況・納期・金額・ラフ画像をまとめて管理。絵師への依頼をもう迷子にしない。",
  keywords: "イラスト依頼, 絵の依頼, 依頼管理, 管理ツール, 納期管理",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Commission Tracker",
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
        {/* AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4461599437148086"
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />

        {children}
        <PageViewTracker />

        {/* GA本体 */}
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
