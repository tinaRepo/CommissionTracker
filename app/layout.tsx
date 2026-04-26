import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Commission Tracker | 絵の依頼管理ツール",
  description: "イラスト・絵の依頼を一元管理できる無料Webアプリ。依頼状況・納期・金額・ラフ画像をまとめて管理。絵師への依頼をもう迷子にしない。",
  keywords: "イラスト依頼, 絵の依頼, 依頼管理, 管理ツール, 納期管理",
  manifest: "/manifest.json",
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
        <Analytics />
        <Script id="register-sw" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        `}</Script>
      </body>
    </html>
  );
}
