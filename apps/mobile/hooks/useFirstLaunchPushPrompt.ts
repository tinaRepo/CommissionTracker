import { useEffect, useRef } from 'react';
import { AppState, Alert } from 'react-native';
import {
    hasAskedPushPermission,
    markPushPermissionAsked,
    enablePushNotifications,
    syncPushTokenIfGranted,
} from '../lib/pushNotifications';

/**
 * 通知の初回確認＋復帰時の自動同期を行うフック。
 *
 * - 初回起動時（端末ごとに1回だけ）：許可するかどうかをユーザーに確認する
 * - 以降：確認は行わない。OSの「設定」アプリから通知をON/OFFしてもらう運用
 * - アプリがバックグラウンドから復帰した時：OS側で許可されていればDBのトークンを同期
 *   （設定アプリから後から許可した場合に、アプリ内操作なしで反映されるようにするため）
 *
 * 使い方：home.tsx（ログイン後の画面）のトップレベルで一度だけ呼び出す。
 *   useFirstLaunchPushPrompt();
 */
export function useFirstLaunchPushPrompt() {
    const askedRef = useRef(false);

    useEffect(() => {
        (async () => {
            // 復帰時と同じ処理を起動時にも一度実行（OS設定で既に許可済みのケースに対応）
            await syncPushTokenIfGranted();

            if (askedRef.current) return;
            askedRef.current = true;

            const alreadyAsked = await hasAskedPushPermission();
            if (alreadyAsked) return;

            Alert.alert(
                '通知を受け取りますか？',
                '納期のお知らせやアプリからのお知らせをプッシュ通知で受け取れます。後から端末の設定アプリでいつでも変更できます。',
                [
                    {
                        text: '後で',
                        style: 'cancel',
                        onPress: () => markPushPermissionAsked(),
                    },
                    {
                        text: '許可する',
                        onPress: async () => {
                            await enablePushNotifications();
                            await markPushPermissionAsked();
                        },
                    },
                ]
            );
        })();
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                syncPushTokenIfGranted();
            }
        });
        return () => subscription.remove();
    }, []);
}
