import SystemMessage from "@/components/SystemMessage";

export default function NotFound() {
    return (
        <SystemMessage
            code="404"
            title="ページが見つかりません"
            description="URLが変更されたか、ページが削除された可能性があります。URLをご確認いただくか、ホームへお戻りください。"
        />
    );
}