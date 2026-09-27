import { noIndexMetadata } from "@/lib/seo";

export const metadata = { ...noIndexMetadata, title: "ログイン | Commission Tracker" };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}