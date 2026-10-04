import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata(
    "利用規約",
    "ツクリストの利用条件を定めた利用規約です。",
    "/terms"
);

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
