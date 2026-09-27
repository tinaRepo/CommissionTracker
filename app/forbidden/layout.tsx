import { noIndexMetadata } from "@/lib/seo";

export const metadata = { ...noIndexMetadata, title: "アクセス権限がありません | Commission Tracker" };

export default function ForbiddenLayout({ children }: { children: React.ReactNode }) {
    return children;
}