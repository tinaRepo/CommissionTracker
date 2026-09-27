import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata(
    "使い方ガイド",
    "イラスト依頼の登録、納期管理、画像添付、通知設定などCommission Trackerの使い方を紹介します。",
    "/guide"
);

export default function GuideLayout({ children }: { children: React.ReactNode }) {
    return children;
}