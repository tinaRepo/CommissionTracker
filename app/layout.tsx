import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commission Tracker | 絵の依頼管理",
  description: "イラスト依頼を一元管理するツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
