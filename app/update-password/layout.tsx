import { noIndexMetadata } from "@/lib/seo";

export const metadata = { ...noIndexMetadata, title: "パスワード設定 | ツクリスト" };

export default function UpdatePasswordLayout({ children }: { children: React.ReactNode }) {
    return children;
}
