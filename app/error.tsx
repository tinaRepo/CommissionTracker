"use client";

import SystemMessage from "@/components/SystemMessage";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <SystemMessage
            code="ERROR"
            title="ページを表示できませんでした"
            description="一時的な問題が発生しました。もう一度読み込むか、時間をおいてからお試しください。"
            onRetry={reset}
        />
    );
}