import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata(
    "プライバシーポリシー",
    "ツクリストにおける個人情報の取得・利用・管理について説明します。",
    "/privacy"
);

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
