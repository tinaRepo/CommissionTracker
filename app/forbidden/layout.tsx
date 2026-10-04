import { noIndexMetadata } from "@/lib/seo";

export const metadata = { ...noIndexMetadata, title: "アクセス権限がありません | ツクリスト" };

export default function ForbiddenLayout({ children }: { children: React.ReactNode }) {
    return children;
}