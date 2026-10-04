import TaskApp from "@/components/TaskApp";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = { ...noIndexMetadata, title: "タスク管理 | ツクリスト" };

export default function Home() {
  return <TaskApp />;
}
