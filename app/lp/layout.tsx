import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata(
    "イラスト依頼をかんたん管理",
    "依頼状況・納期・金額・画像をまとめて管理。絵師への依頼を整理できる無料のイラスト依頼管理ツールです。",
    "/lp"
);

export default function LandingLayout({ children }: { children: React.ReactNode }) {
    return children;
}