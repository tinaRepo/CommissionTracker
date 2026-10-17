import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "共有ページ",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
