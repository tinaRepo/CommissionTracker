import { noIndexMetadata } from "@/lib/seo";

export const metadata = { ...noIndexMetadata, title: "パスワード設定 | Commission Tracker" };

export default function UpdatePasswordLayout({ children }: { children: React.ReactNode }) {
    return children;
}