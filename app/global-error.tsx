"use client";

import SystemMessage from "@/components/SystemMessage";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="ja">
            <body style={{ margin: 0 }}>
                <SystemMessage
                    code="ERROR"
                    title="アプリを起動できませんでした"
                    description="予期しない問題が発生しました。もう一度読み込むか、ホームへお戻りください。"
                    onRetry={reset}
                />
            </body>
        </html>
    );
}
