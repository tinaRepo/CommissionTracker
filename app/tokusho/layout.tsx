import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata(
    "特定商取引法に基づく表記",
    "ツクリストの販売事業者、料金、支払方法、解約条件などの表記です。",
    "/tokusho"
);

export default function TokushoLayout({ children }: { children: React.ReactNode }) {
    return children;
}
