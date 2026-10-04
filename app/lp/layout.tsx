import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata(
    "納期をかんたん管理",
    "依頼状況・納期・金額・画像をまとめて管理。外注・依頼を整理できる無料の納期管理ツールです。",
    "/lp"
);

export default function LandingLayout({ children }: { children: React.ReactNode }) {
    return children;
}