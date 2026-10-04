import { noIndexMetadata } from "@/lib/seo";

export const metadata = { ...noIndexMetadata, title: "管理者ページ | ツクリスト" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return children;
}
