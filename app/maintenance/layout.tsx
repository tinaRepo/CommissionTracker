import { noIndexMetadata } from "@/lib/seo";

export const metadata = { ...noIndexMetadata, title: "メンテナンス中 | ツクリスト" };

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
    return children;
}