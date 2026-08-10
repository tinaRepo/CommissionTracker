import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import {
    registerMobilePushToken,
    unregisterMobilePushToken,
} from '@commission-tracker/supabase';

// フォアグラウンド時の通知表示挙動
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

function getProjectId(): string | undefined {
    // app.json / app.config.* の expo.extra.eas.projectId を利用
    return (
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants.expoConfig as any)?.eas?.projectId
    );
}

/**
 * 通知許可をリクエストし、Expo Push Tokenを取得する。
 * 実機でのみ動作（シミュレータ/エミュレータではnullを返す）。
 */
export async function registerForPushNotificationsAsync(): Promise<
    string | null
> {
    if (!Device.isDevice) {
        console.warn(
            'プッシュ通知は実機でのみ動作します（シミュレータ/エミュレータでは取得できません）'
        );
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }

    const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        return null;
    }

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );
    return tokenResponse.data;
}

/**
 * 通知を許可し、トークンをDBに登録する（トグルON時に呼ぶ）。
 */
export async function enablePushNotifications(): Promise<boolean> {
    const token = await registerForPushNotificationsAsync();
    if (!token) return false;

    await registerMobilePushToken(
        supabase,
        token,
        Platform.OS as 'ios' | 'android',
        Device.osBuildId ?? Device.modelId ?? null
    );
    return true;
}

/**
 * トークンをDBから削除する（トグルOFF時に呼ぶ）。
 */
export async function disablePushNotifications(
    expoPushToken: string
): Promise<void> {
    await unregisterMobilePushToken(supabase, expoPushToken);
}

/**
 * 現在許可済み・取得可能なトークンを返す（UIの初期状態表示用）。
 * 許可されていない場合はnull。
 */
export async function getCurrentPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );
    return tokenResponse.data;
}
