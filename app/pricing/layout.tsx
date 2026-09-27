import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata(
    "料金プラン",
    "Commission Trackerの無料・スタンダード・プレミアム各プランの料金と機能をご案内します。",
    "/pricing"
);

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return children;
}