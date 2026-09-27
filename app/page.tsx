import CommissionApp from "@/components/CommissionApp";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = { ...noIndexMetadata, title: "依頼管理 | Commission Tracker" };

export default function Home() {
  return <CommissionApp />;
}